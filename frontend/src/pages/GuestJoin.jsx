import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function GuestJoin() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { token, logout } = useAuthStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  useEffect(() => {
    // Always fetch event info first to validate the code
    api.get(`/events/info/${code}`)
      .then(r => setEvent(r.data))
      .catch(() => setEvent(null))
      .finally(() => setLoadingEvent(false))

    // If logged in, try to auto-join the event
    if (token) {
      api.post(`/events/join/${code}`)
        .then(({ data }) => {
          navigate(`/event/${data.event.id}`, { replace: true })
        })
        .catch(() => {
          // Token might be stale (DB reset) — clear it and show name form
          logout()
        })
    }
  }, [])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post(`/auth/guest-join/${code}`, { name: name.trim() })
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      useAuthStore.setState({ token: data.token, user: data.user })
      toast.success(`Welcome, ${data.user.name}! 🎯`)
      navigate(`/event/${data.event.id}`, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not join. Check the event code.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-white font-medium">Loading event...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600 p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold">Event Not Found</h2>
          <p className="text-gray-500 mt-2 text-sm">This event code is invalid or the event has ended.</p>
          <p className="font-mono text-lg font-bold text-gray-400 mt-3">{code}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎯</div>
          <h1 className="text-3xl font-bold text-white">ConnectQuest</h1>
          <p className="text-white font-semibold mt-2 text-lg">{event.name}</p>
          <p className="text-white/60 mt-1 text-sm">Enter your name to join and get your bingo card</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-2xl">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Your Name
              </label>
              <input
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none text-lg text-center font-medium transition-colors"
                style={{ fontSize: '18px' }}
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                autoComplete="name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl transition-all active:scale-95"
            >
              {loading ? 'Joining...' : '🚀 Get My Bingo Card'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-brand-600 font-semibold hover:underline"
            >
              Have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
