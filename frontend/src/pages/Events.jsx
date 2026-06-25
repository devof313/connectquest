import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, MapPin, Users, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function Events() {
  const { user } = useAuthStore()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).finally(() => setLoading(false))
  }, [])

  const typeEmoji = { conference: '🎤', hackathon: '💻', corporate: '🏢', university: '🎓', networking: '🤝', startup: '🚀' }

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading events...</div>

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {(user?.role === 'organizer' || user?.role === 'admin') && (
          <Link to="/events/create" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> New Event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-5xl mb-3">🎪</div>
          <p className="font-medium">No events available</p>
          {(user?.role === 'organizer' || user?.role === 'admin') && (
            <Link to="/events/create" className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={16} /> Create First Event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map(ev => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="card p-5 flex items-start gap-4 hover:shadow-md transition-all group border border-transparent hover:border-brand-200 dark:hover:border-brand-700">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: `${ev.theme_color || '#6366f1'}15` }}>
                {typeEmoji[ev.event_type] || '🎪'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg group-hover:text-brand-600 transition-colors">{ev.name}</h3>
                  <span className={`badge shrink-0 ${ev.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {ev.status}
                  </span>
                </div>
                {ev.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ev.description}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  {ev.location && <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
                  {ev.participant_count != null && <span className="flex items-center gap-1"><Users size={12} />{ev.participant_count} joined</span>}
                  {ev.organizer_name && <span className="flex items-center gap-1"><Calendar size={12} />by {ev.organizer_name}</span>}
                  <span className="font-mono font-bold text-brand-600">#{ev.join_code}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
