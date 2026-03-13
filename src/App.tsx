import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TimerBar from './components/timer/TimerBar'
import TimerPage from './pages/TimerPage'
import ProjectsPage from './pages/ProjectsPage'
import ClientsPage from './pages/ClientsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './context/AuthContext'

function ProtectedApp() {
  const { isManager } = useAuth()
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TimerBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<TimerPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {isManager && <Route path="/team" element={<UsersPage />} />}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return <ProtectedApp />
}
