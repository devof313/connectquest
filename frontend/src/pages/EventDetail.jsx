import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'
import { Grid, Trophy, Users, Settings, Scan, ChevronRight } from 'lucide-react'

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    api.get(`/events/${id}`).then(r => setEvent(r.data)).catch(() => navigate('/events'))
    api.get(`/events/${id}/me`).then(r => setParticipation(r.data)).catch(() => {})
  }, [id])

  const joinEvent = async () => {
    setJoining(true)
    try {
      const { data } = await api.post(`/events/join/${event.join_code}`)
      setParticipation(data.participant)
      toast.success('Joined! Your bingo card is ready 🎯')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join')
    } finally {
      setJoining(false)
    }
  }

  if (!event) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin'
  const isMyEvent = event.organizer_id === user?.id || user?.role === 'admin'

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${event.theme_color || '#6366f1'}, ${event.theme_color || '#6366f1'}99)` }}>
        <div className="p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs bg-white/20 rounded-full px-3 py-1 capitalize">{event.event_type}</span>
              <h1 className="text-2xl font-bold mt-2">{event.name}</h1>
              {event.description && <p className="text-white/80 mt-1 text-sm">{event.description}</p>}
              <p className="text-white/60 text-xs mt-2">{event.location || 'Virtual'}</p>
            </div>
            <div className="text-center shrink-0 ml-4">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={`${window.location.origin}/join/${event.join_code}`} size={80} />
              </div>
              <p className="text-xs mt-1 font-mono font-bold">{event.join_code}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Join CTA */}
      {!participation && user?.role === 'participant' && (
        <div className="card p-6 text-center">
          <div className="text-4xl mb-2">🎯</div>
          <h2 className="text-lg font-bold mb-1">Ready to network?</h2>
          <p className="text-gray-500 text-sm mb-4">Join this event to get your bingo card and start connecting!</p>
          <button onClick={joinEvent} disabled={joining} className="btn-primary text-base px-8">
            {joining ? 'Joining...' : 'Join Event & Get Bingo Card'}
          </button>
        </div>
      )}

      {/* Quick actions for joined participants */}
      {participation && (
        <div className="grid grid-cols-2 gap-3">
          <Link to={`/event/${id}`} className="card p-4 flex flex-col items-center gap-2 hover:border-brand-300 border border-transparent transition-all text-center">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Grid size={24} className="text-brand-600" />
            </div>
            <p className="font-semibold text-sm">Bingo Card</p>
            <p className="text-xs text-gray-500">{JSON.parse(participation.completed_challenges || '[]').length} done</p>
          </Link>
          <Link to={`/events/${id}/leaderboard`} className="card p-4 flex flex-col items-center gap-2 hover:border-brand-300 border border-transparent transition-all text-center">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Trophy size={24} className="text-yellow-600" />
            </div>
            <p className="font-semibold text-sm">Leaderboard</p>
            <p className="text-xs text-gray-500">{participation.points || 0} pts earned</p>
          </Link>
          <Link to={`/events/${id}/connections`} className="card p-4 flex flex-col items-center gap-2 hover:border-brand-300 border border-transparent transition-all text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-green-600" />
            </div>
            <p className="font-semibold text-sm">Connections</p>
            <p className="text-xs text-gray-500">People you've met</p>
          </Link>
          <div className="card p-4 flex flex-col items-center gap-2 text-center opacity-60">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Scan size={24} className="text-purple-600" />
            </div>
            <p className="font-semibold text-sm">Scan QR</p>
            <p className="text-xs text-gray-500">Use bingo card</p>
          </div>
        </div>
      )}

      {/* Organizer panel */}
      {isMyEvent && (
        <Link to={`/events/${id}/manage`} className="card p-4 flex items-center gap-4 hover:border-brand-200 dark:hover:border-brand-700 border border-transparent transition-all group">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
            <Settings size={22} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-semibold group-hover:text-brand-600 transition-colors">Manage Event</p>
            <p className="text-sm text-gray-500">Analytics, challenges, participants</p>
          </div>
          <ChevronRight size={18} className="ml-auto text-gray-400" />
        </Link>
      )}
    </div>
  )
}
