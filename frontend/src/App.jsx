import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import BingoCard from './pages/BingoCard'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import JoinEvent from './pages/JoinEvent'
import OrganizerDashboard from './pages/OrganizerDashboard'
import CreateEvent from './pages/CreateEvent'
import AdminDashboard from './pages/AdminDashboard'
import Connections from './pages/Connections'

function PrivateRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', fontWeight: 500 } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join/:code" element={<JoinEvent />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
          <Route path="/events/create" element={<PrivateRoute roles={['organizer','admin']}><CreateEvent /></PrivateRoute>} />
          <Route path="/events/:id" element={<PrivateRoute><EventDetail /></PrivateRoute>} />
          <Route path="/events/:id/bingo" element={<PrivateRoute><BingoCard /></PrivateRoute>} />
          <Route path="/events/:id/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/events/:id/connections" element={<PrivateRoute><Connections /></PrivateRoute>} />
          <Route path="/events/:id/manage" element={<PrivateRoute roles={['organizer','admin']}><OrganizerDashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        </Route>
      </Routes>
    </>
  )
}
