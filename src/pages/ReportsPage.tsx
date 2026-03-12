import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import ReportFilters, { type ReportFilter } from '../components/reports/ReportFilters'
import ReportSummary from '../components/reports/ReportSummary'
import ReportTable from '../components/reports/ReportTable'
import { formatDurationShort, startOfDay, endOfDay } from '../utils/time'
import { Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
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

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilter>(defaultFilters)
  const [exporting, setExporting] = useState(false)

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

  const handleExportPDF = async () => {
    if (!data) return
    setExporting(true)

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const { entries, summary } = data
      const pageW = doc.internal.pageSize.width
      const pageH = doc.internal.pageSize.height
      const margin = 14

      // ── Header stripe ──────────────────────────────────────────────────
      doc.setFillColor(6, 182, 212)   // cyan-500
      doc.rect(0, 0, pageW, 28, 'F')

      // App name
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.text('Zii Track', margin, 12)

      // Report title
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text('Detailed Time Report', margin, 20)

      // Date range — right aligned
      const dateRange = `${format(new Date(filters.from), 'MMM d, yyyy')}  –  ${format(new Date(filters.to), 'MMM d, yyyy')}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(dateRange, pageW - margin, 12, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy, h:mm a')}`, pageW - margin, 20, { align: 'right' })

      // ── Summary bar ────────────────────────────────────────────────────
      const summaryY = 33
      const summaryItems = [
        { label: 'TOTAL TIME',   value: formatDurationShort(summary.total_duration) },
        { label: 'ENTRIES',      value: String(summary.entry_count) },
        { label: 'TOP PROJECT',  value: Object.entries(summary.by_project).sort(([,a],[,b]) => (b as number)-(a as number))[0]?.[0] || '—' },
        { label: 'TOP CLIENT',   value: Object.entries(summary.by_client).sort(([,a],[,b]) => (b as number)-(a as number))[0]?.[0] || '—' },
      ]
      const boxW = (pageW - margin * 2) / 4
      summaryItems.forEach((item, i) => {
        const x = margin + i * boxW
        // Box border
        doc.setDrawColor(220, 240, 245)
        doc.setFillColor(245, 252, 254)
        doc.roundedRect(x, summaryY, boxW - 3, 18, 2, 2, 'FD')
        // Label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(6, 150, 175)
        doc.text(item.label, x + 5, summaryY + 6)
        // Value
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(20, 60, 70)
        const val = item.value.length > 18 ? item.value.substring(0, 17) + '…' : item.value
        doc.text(val, x + 5, summaryY + 14)
      })

      // ── Entries table (grouped by date) ────────────────────────────────
      // Group entries by date
      const grouped: Record<string, any[]> = {}
      for (const e of entries) {
        const dayKey = format(new Date(e.started_at), 'EEEE, MMMM d, yyyy')
        if (!grouped[dayKey]) grouped[dayKey] = []
        grouped[dayKey].push(e)
      }

      const tableBody: any[] = []
      for (const [dayLabel, dayEntries] of Object.entries(grouped)) {
        // Day header row
        tableBody.push([{
          content: dayLabel,
          colSpan: 6,
          styles: {
            fillColor: [236, 250, 253],
            textColor: [6, 120, 145],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
          },
        }])

        // Entry rows
        for (const e of dayEntries) {
          tableBody.push([
            e.description || '—',
            e.client_name || '—',
            e.project_name || '—',
            format(new Date(e.started_at), 'h:mm a') + ' – ' + format(new Date(e.stopped_at), 'h:mm a'),
            formatDurationShort(e.stopped_at - e.started_at),
          ])
        }

        // Day total row
        const dayTotal = dayEntries.reduce((s: number, e: any) => s + (e.stopped_at - e.started_at), 0)
        tableBody.push([
          { content: '', colSpan: 3, styles: { fillColor: [250, 253, 254] } },
          { content: 'Day total', styles: { fillColor: [250, 253, 254], textColor: [100, 130, 140], fontSize: 7.5, fontStyle: 'italic' } },
          {
            content: formatDurationShort(dayTotal),
            styles: { fillColor: [250, 253, 254], textColor: [6, 150, 175], fontStyle: 'bold', fontSize: 8.5 },
          },
        ])
      }

      autoTable(doc, {
        startY: summaryY + 23,
        head: [['Description', 'Client', 'Project', 'Time', 'Duration']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [6, 182, 212],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 5,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40],
          fillColor: [255, 255, 255],
          cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
        },
        alternateRowStyles: {
          fillColor: [249, 251, 252],
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 38 },
          2: { cellWidth: 38 },
          3: { cellWidth: 38 },
          4: { cellWidth: 24, halign: 'right' },
        },
        styles: {
          lineColor: [220, 235, 240],
          lineWidth: 0.25,
          overflow: 'ellipsize',
        },
        margin: { left: margin, right: margin },
      })

      // ── Project breakdown ───────────────────────────────────────────────
      const projectRows = Object.entries(summary.by_project)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([name, ms]) => [name, formatDurationShort(ms as number)])

      if (projectRows.length > 0) {
        const afterTableY = (doc as any).lastAutoTable.finalY + 8
        // Only add if fits on same page (rough check)
        const usedY = afterTableY < pageH - 40 ? afterTableY : null
        if (usedY) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(6, 182, 212)
          doc.text('Time by Project', margin, usedY)

          autoTable(doc, {
            startY: usedY + 4,
            head: [['Project', 'Total Time']],
            body: projectRows,
            theme: 'striped',
            headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 },
            bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 252, 254] },
            columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 30, halign: 'right' } },
            styles: { lineColor: [220, 235, 240], lineWidth: 0.2 },
            margin: { left: margin },
            tableWidth: 103,
          })
        }
      }

      // ── Footer on every page ────────────────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        // Thin footer line
        doc.setDrawColor(220, 235, 240)
        doc.setLineWidth(0.3)
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(160, 175, 180)
        doc.text('Zii Track  ·  Time Report', margin, pageH - 7)
        doc.text(
          `Page ${i} of ${pageCount}  ·  Generated ${format(new Date(), 'MMM d, yyyy')}`,
          pageW - margin, pageH - 7, { align: 'right' }
        )
      }

      doc.save(`zii-track-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  const emptySummary = { total_duration: 0, entry_count: 0, by_project: {}, by_client: {} }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reports</h1>
          <p className="text-white/30 text-sm mt-0.5">Detailed time breakdown</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !data?.entries?.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm font-medium disabled:opacity-40"
        >
          {exporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Export PDF
        </button>
      </div>

      <ReportFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl glass animate-pulse" />)}
          </div>
          <div className="h-64 rounded-2xl glass animate-pulse" />
        </div>
      ) : data ? (
        <>
          <ReportSummary summary={data.summary} />
          <div className="glass rounded-2xl p-5">
            <ReportTable entries={data.entries} />
          </div>
        </>
      ) : (
        <ReportSummary summary={emptySummary} />
      )}
    </div>
  )
}
