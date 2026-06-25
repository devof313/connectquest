import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Trophy, Users, Zap, ChevronRight, Plus } from 'lucide-react'
import useAuthStore from '../store/authStore'
import api from '../utils/api'
import toast from 'react-hot-toast'

const BADGES = [
  { icon: '🤝', name: 'Connector', condition: (u) => u.points >= 10 },
  { icon: '🦋', name: 'Social Butterfly', condition: (u) => u.points >= 50 },
  { icon: '⭐', name: 'Star Networker', condition: (u) => u.points >= 100 },
  { icon: '🏆', name: 'Champion', condition: (u) => u.points >= 200 },
]

export default function Dashboard() {
  const { user, refreshUser } = useAuthStore()
  const [events, setEvents] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    refreshUser()
    api.get('/events').then(r => setEvents(r.data)).catch(() => {})
  }, [])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    try {
      const { data } = await api.post(`/events/join/${joinCode.trim()}`)
      toast.success(`Joined ${data.event.name}!`)
      setJoinCode('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not join event')
    } finally {
      setJoining(false)
    }
  }

  const earnedBadges = BADGES.filter(b => b.condition(user || {}))
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 p-6 text-white">
        <p className="text-white/70 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold mt-1">{user?.name || 'Networker'} 👋</h1>
        <div className="flex items-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{user?.points || 0}</p>
            <p className="text-xs text-white/70">Points</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold">{earnedBadges.length}</p>
            <p className="text-xs text-white/70">Badges</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-bold">{user?.streak || 0}</p>
            <p className="text-xs text-white/70">Streak</p>
          </div>
        </div>
      </div>

      {/* Quick Join */}
      {user?.role === 'participant' && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Zap size={16} className="text-yellow-500" /> Quick Join Event</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input className="input flex-1" placeholder="Enter event code (e.g. ABC123)" value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} />
            <button type="submit" disabled={joining} className="btn-primary whitespace-nowrap">
              {joining ? '...' : 'Join'}
            </button>
          </form>
        </div>
      )}

      {/* Organizer quick action */}
      {(user?.role === 'organizer' || user?.role === 'admin') && (
        <Link to="/events/create" className="card p-5 flex items-center gap-4 hover:border-brand-300 border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
            <Plus size={24} />
          </div>
          <div>
            <p className="font-semibold group-hover:text-brand-600 transition-colors">Create New Event</p>
            <p className="text-sm text-gray-500">Set up bingo challenges for your attendees</p>
          </div>
          <ChevronRight size={18} className="ml-auto text-gray-400" />
        </Link>
      )}

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> Your Badges</h2>
          <div className="flex flex-wrap gap-3">
            {earnedBadges.map(b => (
              <div key={b.name} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-2xl shadow-sm">{b.icon}</div>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Calendar size={16} /> Active Events</h2>
          <Link to="/events" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {events.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🎪</div>
            <p>No active events yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 3).map(ev => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="card p-4 flex items-center gap-4 hover:border-brand-200 dark:hover:border-brand-700 border border-transparent transition-all group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${ev.theme_color || '#6366f1'}20` }}>
                  {ev.event_type === 'hackathon' ? '💻' : ev.event_type === 'conference' ? '🎤' : ev.event_type === 'corporate' ? '🏢' : '🎪'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate group-hover:text-brand-600 transition-colors">{ev.name}</p>
                  <p className="text-sm text-gray-500 truncate">{ev.location || 'Virtual'} · Code: <span className="font-mono font-bold">{ev.join_code}</span></p>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      {!user?.company && (
        <div className="card p-4 border-l-4 border-brand-500 bg-brand-50 dark:bg-brand-900/20">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">💡 Complete your profile to get better networking matches!</p>
          <Link to="/profile" className="text-sm text-brand-600 hover:underline mt-1 inline-block">Update profile →</Link>
        </div>
      )}
    </div>
  )
}
