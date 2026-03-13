import { NavLink, useNavigate } from 'react-router-dom'
import { Timer, FolderOpen, Users, BarChart3, UsersRound, LogOut, Crown, UserCircle } from 'lucide-react'
import { useRunningTimer } from '../../hooks/useRunningTimer'
import { useAuth } from '../../context/AuthContext'

const baseNav = [
  { to: '/', icon: Timer, label: 'Timer' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

export default function Sidebar() {
  const { runningEntry } = useRunningTimer()
  const { user, isManager, logout } = useAuth()
  const navigate = useNavigate()

  const nav = isManager
    ? [...baseNav, { to: '/team', icon: UsersRound, label: 'Team' }]
    : baseNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-screen border-r border-white/[0.06] bg-black/30 backdrop-blur-2xl">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_16px_rgba(6,182,212,0.5)]">
          <span className="text-white font-bold text-sm leading-none">T</span>
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-none">Tempo Ticker</div>
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

      {/* User info + logout */}
      {user && (
        <div className="px-3 pb-3 border-t border-white/[0.05] pt-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-300 text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                {user.role === 'manager' && <Crown size={9} className="text-cyan-400" />}
                <p className="text-white/30 text-[10px] capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-white/20 hover:text-white/60 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
