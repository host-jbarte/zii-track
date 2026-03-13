import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ReportFilters, { type ReportFilter } from '../components/reports/ReportFilters'
import { formatDuration, formatDurationShort, startOfDay, endOfDay } from '../utils/time'
import { Download, Loader2 } from 'lucide-react'
import { format, eachDayOfInterval, isSameDay } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function defaultFilters(): ReportFilter {
  const now = new Date()
  const monday = new Date(now)
  const day = now.getDay()
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return {
    from: startOfDay(monday),
    to: endOfDay(now),
    project_id: '',
    client_id: '',
  }
}

// Consistent color palette for projects
const CHART_COLORS = [
  '#06b6d4', '#f97316', '#a855f7', '#22c55e', '#ef4444',
  '#3b82f6', '#eab308', '#ec4899', '#14b8a6', '#f59e0b',
]

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilter>(defaultFilters)
  const [exporting, setExporting] = useState(false)
  const [sliceBy, setSliceBy] = useState<'projects' | 'clients'>('projects')
  const [showAllEntries, setShowAllEntries] = useState(false)

  const params: Record<string, string> = {
    from: String(filters.from),
    to: String(filters.to),
  }
  if (filters.project_id) params.project_id = filters.project_id
  if (filters.client_id) params.client_id = filters.client_id

  const { data, isLoading } = useQuery({
    queryKey: ['reports', params],
    queryFn: () => api.reports.get(params),
  })

  const entries = data?.entries || []
  const summary = data?.summary || { total_duration: 0, entry_count: 0, by_project: {}, by_client: {} }

  // ── Compute daily durations ──────────────────────────────────────
  const days = (() => {
    try {
      return eachDayOfInterval({ start: new Date(filters.from), end: new Date(filters.to) })
    } catch { return [] }
  })()

  const dailyData = days.map(day => {
    const dayEntries = entries.filter((e: any) => isSameDay(new Date(e.started_at), day))
    const ms = dayEntries.reduce((s: number, e: any) => s + (e.stopped_at - e.started_at), 0)
    return { date: day, ms }
  })

  const maxMs = Math.max(...dailyData.map(d => d.ms), 1)
  const avgDaily = dailyData.length > 0
    ? dailyData.reduce((s, d) => s + d.ms, 0) / dailyData.filter(d => d.ms > 0).length || 0
    : 0

  // ── Distribution data ────────────────────────────────────────────
  const distMap = sliceBy === 'projects' ? summary.by_project : summary.by_client
  const distEntries = Object.entries(distMap)
    .sort(([, a], [, b]) => (b as number) - (a as number))
  const distTotal = distEntries.reduce((s, [, v]) => s + (v as number), 0)

  // ── Breakdown rows ───────────────────────────────────────────────
  const breakdownRows = distEntries.map(([name, ms], i) => ({
    name,
    ms: ms as number,
    pct: distTotal > 0 ? ((ms as number) / distTotal * 100) : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  // ── Donut chart SVG ──────────────────────────────────────────────
  const donutSegments = (() => {
    if (distEntries.length === 0) return []
    let cumulative = 0
    return distEntries.map(([name, ms], i) => {
      const pct = distTotal > 0 ? (ms as number) / distTotal : 0
      const startAngle = cumulative * 360
      const endAngle = (cumulative + pct) * 360
      cumulative += pct
      return { name, pct, startAngle, endAngle, color: CHART_COLORS[i % CHART_COLORS.length] }
    })
  })()

  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const rad = (a: number) => (a - 90) * Math.PI / 180
    const start = { x: cx + r * Math.cos(rad(endAngle)), y: cy + r * Math.sin(rad(endAngle)) }
    const end = { x: cx + r * Math.cos(rad(startAngle)), y: cy + r * Math.sin(rad(startAngle)) }
    const large = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
  }

  // ── PDF Export ────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!data) return
    setExporting(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.width
      const pageH = doc.internal.pageSize.height
      const m = 14
      const contentW = pageW - m * 2

      const addFooter = () => {
        const pc = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pc; i++) {
          doc.setPage(i)
          doc.setDrawColor(220, 235, 240)
          doc.setLineWidth(0.3)
          doc.line(m, pageH - 12, pageW - m, pageH - 12)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(160, 175, 180)
          doc.text('Tempo Ticker  ·  Time Report', m, pageH - 7)
          doc.text(`Page ${i} of ${pc}  ·  Generated ${format(new Date(), 'MMM d, yyyy')}`, pageW - m, pageH - 7, { align: 'right' })
        }
      }

      // ── PAGE 1: Summary + Charts ─────────────────────────────────
      // Header stripe
      doc.setFillColor(6, 182, 212)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.text('Tempo Ticker', m, 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Detailed Time Report', m, 20)
      const dateRange = `${format(new Date(filters.from), 'MMM d, yyyy')}  –  ${format(new Date(filters.to), 'MMM d, yyyy')}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(dateRange, pageW - m, 12, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy, h:mm a')}`, pageW - m, 20, { align: 'right' })

      // Summary boxes
      let y = 33
      const summaryItems = [
        { label: 'TOTAL HOURS', value: formatDuration(summary.total_duration) },
        { label: 'BILLABLE HOURS', value: formatDuration(summary.billable_duration || 0) },
        { label: 'ENTRIES', value: String(summary.entry_count) },
        { label: 'AVG DAILY', value: avgDaily > 0 ? (avgDaily / 3600000).toFixed(2) + ' hrs' : '0 hrs' },
      ]
      const boxW = (contentW) / 4
      summaryItems.forEach((item, i) => {
        const x = m + i * boxW
        doc.setDrawColor(220, 240, 245)
        doc.setFillColor(245, 252, 254)
        doc.roundedRect(x, y, boxW - 3, 18, 2, 2, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(6, 150, 175)
        doc.text(item.label, x + 4, y + 6)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(20, 60, 70)
        doc.text(item.value, x + 4, y + 14)
      })

      // ── Duration by Day bar chart ────────────────────────────────
      y = 57
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(40, 40, 40)
      doc.text('Duration by Day', m, y)
      y += 4

      const chartH = 40
      const chartW = contentW
      const daysWithData = dailyData.filter(d => d.ms > 0)
      const chartDays = dailyData.length > 0 ? dailyData : []
      const chartMax = Math.max(...chartDays.map(d => d.ms), 1)

      if (chartDays.length > 0) {
        // Y-axis labels
        const yAxisSteps = 4
        for (let i = 0; i <= yAxisSteps; i++) {
          const val = (chartMax / yAxisSteps) * (yAxisSteps - i)
          const ly = y + (chartH / yAxisSteps) * i
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(5.5)
          doc.setTextColor(160, 160, 170)
          const label = val >= 3600000 ? (val / 3600000).toFixed(1) + 'h' : Math.round(val / 60000) + 'm'
          doc.text(label, m, ly + 1)
          doc.setDrawColor(240, 240, 245)
          doc.setLineWidth(0.1)
          doc.line(m + 14, ly, m + chartW, ly)
        }

        // Bars
        const barAreaX = m + 15
        const barAreaW = chartW - 15
        const barW = Math.min(barAreaW / chartDays.length - 1, 12)
        const gap = (barAreaW - barW * chartDays.length) / (chartDays.length + 1)

        chartDays.forEach((d, i) => {
          const barH = chartMax > 0 ? (d.ms / chartMax) * chartH : 0
          const x = barAreaX + gap + i * (barW + gap)
          if (barH > 0) {
            doc.setFillColor(6, 182, 212)
            doc.roundedRect(x, y + chartH - barH, barW, barH, 0.5, 0.5, 'F')
          }
          // Day label
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(4.5)
          doc.setTextColor(140, 140, 150)
          const dayLabel = chartDays.length <= 14 ? format(d.date, 'EEE') : format(d.date, 'MM/dd')
          doc.text(dayLabel, x + barW / 2, y + chartH + 4, { align: 'center' })
        })
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 190)
        doc.text('No data for this period', m + chartW / 2, y + chartH / 2, { align: 'center' })
      }

      // ── Project Breakdown (with bars) ────────────────────────────
      y = y + chartH + 12
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(40, 40, 40)
      doc.text('Project Breakdown', m, y)
      y += 2

      const pdfColors = [[6,182,212],[249,115,22],[168,85,247],[34,197,94],[239,68,68],[59,130,246],[234,179,8],[236,72,153]]
      const projectBreakdown = Object.entries(summary.by_project)
        .sort(([,a],[,b]) => (b as number) - (a as number))
      const projTotal = projectBreakdown.reduce((s, [,v]) => s + (v as number), 0)

      if (projectBreakdown.length > 0) {
        const tableLeft = m
        const nameW = 55
        const barMaxW = contentW - nameW - 50
        const rowH = 7

        // Header
        y += 3
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(120, 130, 140)
        doc.text('PROJECT', tableLeft, y)
        doc.text('DURATION', tableLeft + nameW, y)
        doc.text('%', tableLeft + nameW + barMaxW + 8, y)
        y += 2
        doc.setDrawColor(220, 235, 240)
        doc.setLineWidth(0.3)
        doc.line(tableLeft, y, tableLeft + contentW, y)
        y += 3

        projectBreakdown.forEach(([name, ms], i) => {
          const pct = projTotal > 0 ? (ms as number) / projTotal * 100 : 0
          const color = pdfColors[i % pdfColors.length]

          // Color dot + name
          doc.setFillColor(color[0], color[1], color[2])
          doc.circle(tableLeft + 2, y - 1, 1.5, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(40, 40, 40)
          const truncName = name.length > 25 ? name.substring(0, 24) + '…' : name
          doc.text(truncName, tableLeft + 6, y)

          // Bar background
          doc.setFillColor(240, 245, 248)
          doc.roundedRect(tableLeft + nameW, y - 3, barMaxW, 4, 1, 1, 'F')
          // Bar fill
          const fillW = Math.max((pct / 100) * barMaxW, 1)
          doc.setFillColor(color[0], color[1], color[2])
          doc.roundedRect(tableLeft + nameW, y - 3, fillW, 4, 1, 1, 'F')

          // Duration text
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(80, 90, 100)
          doc.text(formatDuration(ms as number), tableLeft + nameW + barMaxW - 1, y, { align: 'right' })

          // Percentage
          doc.setTextColor(120, 130, 140)
          doc.text(`${pct.toFixed(1)}%`, tableLeft + nameW + barMaxW + 8, y)

          y += rowH
        })

        // Total row
        doc.setDrawColor(220, 235, 240)
        doc.setLineWidth(0.2)
        doc.line(tableLeft, y - 3, tableLeft + contentW, y - 3)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(40, 40, 40)
        doc.text('TOTAL', tableLeft + 6, y + 1)
        doc.text(formatDuration(projTotal), tableLeft + nameW + barMaxW - 1, y + 1, { align: 'right' })
        doc.text('100%', tableLeft + nameW + barMaxW + 8, y + 1)
      }

      // ── PAGE 2+: Detailed Entries Table ───────────────────────────
      doc.addPage()

      // Mini header on entries page
      doc.setFillColor(6, 182, 212)
      doc.rect(0, 0, pageW, 16, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text('Detailed Entries', m, 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`${dateRange}  ·  ${entries.length} entries`, pageW - m, 10, { align: 'right' })

      // Group entries by date
      const grouped: Record<string, any[]> = {}
      for (const e of entries) {
        const dayKey = format(new Date(e.started_at), 'EEEE, MMMM d, yyyy')
        if (!grouped[dayKey]) grouped[dayKey] = []
        grouped[dayKey].push(e)
      }

      const tableBody: any[] = []
      for (const [dayLabel, dayEntries] of Object.entries(grouped)) {
        tableBody.push([{
          content: dayLabel, colSpan: 6,
          styles: { fillColor: [236, 250, 253], textColor: [6, 120, 145], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
        }])
        for (const e of dayEntries) {
          tableBody.push([
            e.description || '—',
            e.client_name || '—',
            e.project_name || '—',
            e.is_billable ? '$' : '',
            format(new Date(e.started_at), 'h:mm a') + ' – ' + format(new Date(e.stopped_at), 'h:mm a'),
            formatDurationShort(e.stopped_at - e.started_at),
          ])
        }
        const dayTotal = dayEntries.reduce((s: number, e: any) => s + (e.stopped_at - e.started_at), 0)
        tableBody.push([
          { content: '', colSpan: 4, styles: { fillColor: [250, 253, 254] } },
          { content: 'Day total', styles: { fillColor: [250, 253, 254], textColor: [100, 130, 140], fontSize: 7.5, fontStyle: 'italic' } },
          { content: formatDurationShort(dayTotal), styles: { fillColor: [250, 253, 254], textColor: [6, 150, 175], fontStyle: 'bold', fontSize: 8.5 } },
        ])
      }

      autoTable(doc, {
        startY: 22,
        head: [['Description', 'Client', 'Project', '$', 'Time', 'Duration']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: 5 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40], fillColor: [255, 255, 255], cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 } },
        alternateRowStyles: { fillColor: [249, 251, 252] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 8, halign: 'center' },
          4: { cellWidth: 38 },
          5: { cellWidth: 22, halign: 'right' },
        },
        styles: { lineColor: [220, 235, 240], lineWidth: 0.25, overflow: 'ellipsize' },
        margin: { left: m, right: m },
      })

      addFooter()
      doc.save(`tempo-ticker-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reports</h1>
          <p className="text-white/30 text-sm mt-0.5">Summary &middot; Charts &middot; Breakdown</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !entries.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm font-medium disabled:opacity-40"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export PDF
        </button>
      </div>

      <ReportFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl glass animate-pulse" />)}
          </div>
          <div className="h-64 rounded-2xl glass animate-pulse" />
        </div>
      ) : (
        <>
          {/* ── Summary Bar ──────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4" style={{ boxShadow: 'inset 0 0 40px rgba(6,182,212,0.15)' }}>
              <div className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-cyan-400">{formatDuration(summary.total_duration)}</div>
            </div>
            <div className="glass rounded-2xl p-4" style={{ boxShadow: 'inset 0 0 40px rgba(59,130,246,0.12)' }}>
              <div className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Billable Hours</div>
              <div className="text-2xl font-bold text-blue-400">{formatDuration(summary.billable_duration || 0)}</div>
            </div>
            <div className="glass rounded-2xl p-4" style={{ boxShadow: 'inset 0 0 40px rgba(16,185,129,0.12)' }}>
              <div className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">Average Daily Hours</div>
              <div className="text-2xl font-bold text-emerald-400">
                {avgDaily > 0 ? (avgDaily / 3600000).toFixed(2) : '0'} <span className="text-sm font-normal text-white/30">Hours</span>
              </div>
            </div>
          </div>

          {/* ── Charts Row: Duration by day + Distribution ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
            {/* Duration by Day */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70">Duration by day</h3>
              </div>
              {dailyData.length > 0 ? (
                <div className="flex items-end gap-1 h-52">
                  {dailyData.map((d, i) => {
                    const height = maxMs > 0 ? (d.ms / maxMs) * 100 : 0
                    const isToday = isSameDay(d.date, new Date())
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10 border border-white/10">
                          {format(d.date, 'MMM d')}: {formatDuration(d.ms)}
                        </div>
                        {/* Bar */}
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t transition-all duration-300"
                            style={{
                              height: `${Math.max(height, d.ms > 0 ? 3 : 0)}%`,
                              background: isToday
                                ? 'linear-gradient(to top, #06b6d4, #22d3ee)'
                                : 'linear-gradient(to top, rgba(6,182,212,0.5), rgba(6,182,212,0.7))',
                            }}
                          />
                        </div>
                        {/* Label */}
                        <span className="text-[9px] text-white/30 mt-1">
                          {dailyData.length <= 14
                            ? format(d.date, 'EEE')
                            : (i % Math.ceil(dailyData.length / 10) === 0 ? format(d.date, 'MM/dd') : '')
                          }
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-white/20 text-sm">No data</div>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                  <span className="text-[10px] text-white/40">Duration</span>
                </div>
              </div>
            </div>

            {/* Project/Client Distribution Donut */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70">
                  {sliceBy === 'projects' ? 'Project' : 'Client'} distribution
                </h3>
                <select
                  value={sliceBy}
                  onChange={e => setSliceBy(e.target.value as any)}
                  className="select-glass text-[11px] py-1 px-2"
                >
                  <option value="projects">Projects</option>
                  <option value="clients">Clients</option>
                </select>
              </div>

              {distEntries.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Donut */}
                  <div className="relative">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {donutSegments.length === 1 ? (
                        <circle cx="80" cy="80" r="60" fill="none" stroke={donutSegments[0].color} strokeWidth="20" />
                      ) : (
                        donutSegments.map((seg, i) => (
                          <path
                            key={i}
                            d={describeArc(80, 80, 60, seg.startAngle, seg.endAngle - 0.5)}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="20"
                            strokeLinecap="butt"
                          />
                        ))
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-white">{formatDuration(distTotal)}</span>
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">
                        {sliceBy === 'projects' ? 'project' : 'client'}
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="w-full space-y-1.5 max-h-28 overflow-y-auto">
                    {breakdownRows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-white/60 truncate flex-1">{r.name}</span>
                        <span className="text-white/30 tabular-nums">{r.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-white/20 text-sm">No data</div>
              )}
            </div>
          </div>

          {/* ── Project/Client Breakdown Table ────────────────── */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/70">
                {sliceBy === 'projects' ? 'Project' : 'Client'} breakdown
              </h3>
            </div>

            {breakdownRows.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider pb-3 pr-4">
                      {sliceBy === 'projects' ? 'Project' : 'Client'}
                    </th>
                    <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider pb-3 pr-4 w-40">Duration</th>
                    <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider pb-3 w-24">Duration %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {breakdownRows.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                          <span className="text-white/70">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                            />
                          </div>
                          <span className="text-white/50 tabular-nums text-xs w-16 text-right">{formatDuration(r.ms)}</span>
                        </div>
                      </td>
                      <td className="py-3 text-white/40 tabular-nums">{r.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.1]">
                    <td className="py-3 pr-4 text-white/50 font-semibold text-xs uppercase">Total</td>
                    <td className="py-3 pr-4 text-white/60 font-semibold tabular-nums text-right pr-[76px]">{formatDuration(distTotal)}</td>
                    <td className="py-3 text-white/40 tabular-nums font-semibold">100%</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="py-8 text-center text-white/20 text-sm">No data for the selected period.</div>
            )}
          </div>

          {/* ── Detailed Entries Preview ─────────────────────── */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/70">Detailed entries</h3>
              {entries.length > 5 && (
                <button
                  onClick={() => setShowAllEntries(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  View all {entries.length} entries
                </button>
              )}
            </div>
            {entries.length > 0 ? (
              <div className="space-y-2">
                {entries.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/80 truncate">{e.description || <span className="text-white/25 italic">No description</span>}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/30">{format(new Date(e.started_at), 'MMM d')}</span>
                        {e.project_name && (
                          <span className="tag text-[10px]" style={{ color: e.project_color, borderColor: e.project_color + '40', backgroundColor: e.project_color + '15' }}>
                            {e.project_name}
                          </span>
                        )}
                        {e.client_name && (
                          <span className="tag text-[10px] text-white/40 border-white/10 bg-white/[0.05]">{e.client_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-medium text-white/60 tabular-nums">{formatDurationShort(e.stopped_at - e.started_at)}</div>
                      <div className="text-[10px] text-white/25 tabular-nums">{format(new Date(e.started_at), 'h:mm a')} – {format(new Date(e.stopped_at), 'h:mm a')}</div>
                    </div>
                  </div>
                ))}
                {entries.length > 5 && (
                  <button
                    onClick={() => setShowAllEntries(true)}
                    className="w-full py-2.5 text-xs text-cyan-400/70 hover:text-cyan-400 hover:bg-white/[0.03] rounded-xl transition-colors"
                  >
                    + {entries.length - 5} more entries
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-white/20 text-sm">No entries for the selected period.</div>
            )}
          </div>

          {/* ── Full Entries Modal ────────────────────────────── */}
          {showAllEntries && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAllEntries(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="relative glass-strong rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-lg font-semibold text-white">All entries</h2>
                    <p className="text-xs text-white/30 mt-0.5">
                      {format(new Date(filters.from), 'MMM d, yyyy')} – {format(new Date(filters.to), 'MMM d, yyyy')} &middot; {entries.length} entries
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllEntries(false)}
                    className="text-white/40 hover:text-white/70 text-xl leading-none px-2 py-1 rounded-lg hover:bg-white/[0.08] transition-colors"
                  >
                    &times;
                  </button>
                </div>

                {/* Modal body */}
                <div className="overflow-y-auto p-5">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-white/[0.07]">
                        {['Date', 'Description', 'Client', 'Project', 'Time', 'Duration'].map(h => (
                          <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider pb-3 pr-4 last:pr-0 bg-[#0a0a1a]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {entries.map((e: any) => (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-4 text-white/40 text-xs tabular-nums whitespace-nowrap">
                            {format(new Date(e.started_at), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 pr-4 text-white/80 max-w-[280px] truncate">
                            {e.description || <span className="text-white/25 italic">No description</span>}
                          </td>
                          <td className="py-3 pr-4 min-w-[110px]">
                            {e.client_name ? (
                              <span className="tag text-[11px] text-white/50 border-white/10 bg-white/[0.05] whitespace-nowrap">{e.client_name}</span>
                            ) : <span className="text-white/20">-</span>}
                          </td>
                          <td className="py-3 pr-4 min-w-[110px]">
                            {e.project_name ? (
                              <span className="tag text-[11px] whitespace-nowrap" style={{ color: e.project_color, borderColor: e.project_color + '40', backgroundColor: e.project_color + '15' }}>
                                {e.project_name}
                              </span>
                            ) : <span className="text-white/20">-</span>}
                          </td>
                          <td className="py-3 pr-4 text-xs text-white/30 tabular-nums whitespace-nowrap">
                            {format(new Date(e.started_at), 'h:mm a')} – {format(new Date(e.stopped_at), 'h:mm a')}
                          </td>
                          <td className="py-3 text-sm font-medium text-white/60 tabular-nums text-right">
                            {formatDurationShort(e.stopped_at - e.started_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
