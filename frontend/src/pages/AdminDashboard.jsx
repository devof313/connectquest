import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Shield, Users, Calendar } from 'lucide-react'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('users')

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    api.get('/events').then(r => setEvents(r.data)).catch(() => {})
  }, [])

  const changeRole = async (uid, role) => {
    try {
      await api.put(`/users/${uid}/role`, { role })
      setUsers(p => p.map(u => u.id === uid ? { ...u, role } : u))
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  const toggleEventStatus = async (ev) => {
    const newStatus = ev.status === 'active' ? 'closed' : 'active'
    try {
      await api.put(`/events/${ev.id}`, { ...ev, status: newStatus })
      setEvents(p => p.map(e => e.id === ev.id ? { ...e, status: newStatus } : e))
      toast.success(`Event ${newStatus}`)
    } catch {
      toast.error('Failed to update event')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-red-500" /> Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">{users.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{events.filter(e => e.status === 'active').length}</p>
          <p className="text-sm text-gray-500 mt-1">Active Events</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{users.filter(u => u.role === 'organizer').length}</p>
          <p className="text-sm text-gray-500 mt-1">Organizers</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {['users', 'events'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500'}`}>
            {t === 'users' ? `👥 Users (${users.length})` : `📅 Events (${events.length})`}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.name || 'No name'}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 shrink-0">
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ev.name}</p>
                <p className="text-xs text-gray-500 truncate">by {ev.organizer_name} · code: {ev.join_code}</p>
              </div>
              <span className={`badge shrink-0 ${ev.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ev.status}</span>
              <button onClick={() => toggleEventStatus(ev)} className="text-xs btn-secondary py-1 px-2 shrink-0">
                {ev.status === 'active' ? 'Close' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
