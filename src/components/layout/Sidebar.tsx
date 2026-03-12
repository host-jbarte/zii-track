import { NavLink } from 'react-router-dom'
import { Timer, FolderOpen, Users, BarChart3 } from 'lucide-react'
import { useRunningTimer } from '../../hooks/useRunningTimer'

const nav = [
  { to: '/', icon: Timer, label: 'Timer' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

export default function Sidebar() {
  const { runningEntry } = useRunningTimer()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen border-r border-white/[0.06] bg-black/30 backdrop-blur-2xl">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_16px_rgba(6,182,212,0.5)]">
          <span className="text-white font-bold text-sm leading-none">Z</span>
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-none">Zii Track</div>
          <div className="text-white/30 text-[11px] mt-0.5">Time Tracker</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-white/60'} />
                <span>{label}</span>
                {label === 'Timer' && runningEntry && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.05]">
        <p className="text-white/20 text-[11px]">v1.0.0 · Local</p>
      </div>
    </aside>
  )
}
