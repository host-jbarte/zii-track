import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDurationShort } from '../utils/time'
import { Crown, User, Lock, Save } from 'lucide-react'

const DAY_MS = 86400000
const WORK_DAY_MS = 8 * 3600 * 1000 // 8h reference for bar max

// --- Work-life balance bar ---
function BalanceBar({ workMs, breakMs }: { workMs: number; breakMs: number }) {
  const totalTracked = workMs + breakMs
  const lifeMs = Math.max(DAY_MS - totalTracked, 0)
  const total = DAY_MS

  const workPct = (workMs / total) * 100
  const breakPct = (breakMs / total) * 100
  const lifePct = (lifeMs / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        <div className="bg-cyan-500 transition-all" style={{ width: `${workPct}%` }} title={`Work: ${formatDurationShort(workMs)}`} />
        <div className="bg-orange-400/70 transition-all" style={{ width: `${breakPct}%` }} title={`Break: ${formatDurationShort(breakMs)}`} />
        <div className="bg-white/[0.07] transition-all" style={{ width: `${lifePct}%` }} title={`Personal: ${formatDurationShort(lifeMs)}`} />
      </div>
    </div>
  )
}

// --- Daily chart ---
function DailyChart({ data }: { data: any[] }) {
  const maxWork = Math.max(...data.map(d => d.work_ms), WORK_DAY_MS)

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1.5 h-28">
        {data.map(d => {
          const workH = (d.work_ms / maxWork) * 100
          const breakH = (d.break_ms / maxWork) * 100
          const date = new Date(d.date + 'T00:00:00')
          const n = new Date(); const todayLocal = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
          const isToday = d.date === todayLocal
          const dayLabel = isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' })

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${formatDurationShort(d.work_ms)} work${d.break_ms ? `, ${formatDurationShort(d.break_ms)} break` : ''}`}>
              <div className="w-full flex flex-col justify-end gap-px" style={{ height: '96px' }}>
                {d.break_ms > 0 && (
                  <div
                    className="w-full rounded-sm bg-orange-400/50 transition-all"
                    style={{ height: `${Math.max(breakH, d.break_ms > 0 ? 3 : 0)}%` }}
                  />
                )}
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? 'bg-cyan-400' : 'bg-cyan-600/60 group-hover:bg-cyan-500/80'}`}
                  style={{ height: `${Math.max(workH, d.work_ms > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className={`text-[10px] ${isToday ? 'text-cyan-400' : 'text-white/30'}`}>{dayLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-white/30">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" />Work</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-orange-400/70 inline-block" />Break</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/[0.07] inline-block" />Personal time</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, login, token } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileMsg, setProfileMsg] = useState('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  const { data: analytics = [] } = useQuery({
    queryKey: ['analytics', 'daily', 14],
    queryFn: () => api.analytics.daily({ days: '14' }),
  })

  // Summaries
  const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })()
  const todayData = analytics.find((d: any) => d.date === todayStr)
  const thisWeek = analytics.slice(-7).reduce((s: number, d: any) => s + d.work_ms, 0)
  const avgPerDay = analytics.filter((d: any) => d.work_ms > 0).length
    ? analytics.filter((d: any) => d.work_ms > 0).reduce((s: number, d: any) => s + d.work_ms, 0) /
      analytics.filter((d: any) => d.work_ms > 0).length
    : 0

  const profileMutation = useMutation({
    mutationFn: () => api.auth.updateProfile({ name, email }),
    onSuccess: (data) => {
      login(data.user, data.token)
      setProfileMsg('Profile updated!')
      setTimeout(() => setProfileMsg(''), 3000)
    },
    onError: (e: any) => setProfileMsg(e.message),
  })

  const passwordMutation = useMutation({
    mutationFn: () => api.auth.changePassword({ current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setCurrentPw('')
      setNewPw('')
      setPwMsg('Password changed!')
      setTimeout(() => setPwMsg(''), 3000)
    },
    onError: (e: any) => setPwMsg(e.message),
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-white/40 text-sm mt-1">Manage your account and view your time analytics</p>
        </div>

        {/* Profile + Password in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile info */}
          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={14} className="text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Account Info</h2>
            </div>

            {/* Avatar + role */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <span className="text-cyan-300 text-lg font-semibold">{user?.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">{user?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {user?.role === 'manager' ? <Crown size={10} className="text-cyan-400" /> : <User size={10} className="text-white/40" />}
                  <span className="text-white/40 text-xs capitalize">{user?.role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-glass w-full" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-glass w-full" />
              </div>
            </div>

            {profileMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg border ${profileMsg.includes('!') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {profileMsg}
              </p>
            )}
            <button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending}
              className="btn-primary w-full justify-center py-2"
            >
              <Save size={13} /> Save Changes
            </button>
          </div>

          {/* Change password */}
          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={14} className="text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Change Password</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="input-glass w-full" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" minLength={6} className="input-glass w-full" />
              </div>
            </div>

            {pwMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg border ${pwMsg.includes('!') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {pwMsg}
              </p>
            )}
            <button
              onClick={() => passwordMutation.mutate()}
              disabled={passwordMutation.isPending || !currentPw || !newPw}
              className="btn-primary w-full justify-center py-2 disabled:opacity-40"
            >
              <Lock size={13} /> Update Password
            </button>
          </div>
        </div>

        {/* Analytics */}
        <div className="glass-strong rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white">Time Analytics — Last 14 Days</h2>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Today", value: formatDurationShort(todayData?.work_ms || 0) },
              { label: "This Week", value: formatDurationShort(thisWeek) },
              { label: "Avg / Active Day", value: formatDurationShort(avgPerDay) },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <p className="text-cyan-300 text-lg font-bold">{s.value}</p>
                <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {analytics.length > 0 && <DailyChart data={analytics} />}
        </div>

        {/* Work-Life balance today */}
        {todayData && (
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Work-Life Balance — Today</h2>
              <span className="text-white/30 text-xs">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            <BalanceBar workMs={todayData.work_ms} breakMs={todayData.break_ms} />
            <div className="flex items-center justify-between text-xs text-white/40 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />Work <span className="text-white/60 font-medium">{formatDurationShort(todayData.work_ms)}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400/70 inline-block" />Break <span className="text-white/60 font-medium">{formatDurationShort(todayData.break_ms)}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20 inline-block" />Personal <span className="text-white/60 font-medium">{formatDurationShort(Math.max(DAY_MS - todayData.work_ms - todayData.break_ms, 0))}</span></span>
            </div>
            {todayData.work_ms > 0 && (
              <p className="text-white/25 text-xs text-center pt-1">
                {todayData.work_ms >= 8 * 3600 * 1000
                  ? `You've put in a full day's work. Great job!`
                  : `${formatDurationShort(8 * 3600 * 1000 - todayData.work_ms)} left to reach 8h today.`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
