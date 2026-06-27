import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function GuestJoin() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { token, updateUser } = useAuthStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState(null)

  // Already logged in → go straight to participant view
  useEffect(() => {
    if (token) {
      api.post(`/events/join/${code}`)
        .then(({ data }) => navigate(`/event/${data.event.id}`, { replace: true }))
        .catch(() => navigate(`/event-join/${code}`, { replace: true }))
    } else {
      // Fetch event info for display
      api.get(`/events/info/${code}`).then(r => setEvent(r.data)).catch(() => {})
    }
  }, [])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post(`/auth/guest-join/${code}`, { name: name.trim() })
      // Store token + user in auth store
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      // Use the store's own updateUser rather than setState directly (safer across browsers)
      useAuthStore.getState().updateUser(data.user)
      useAuthStore.setState({ token: data.token })
      // Persist to localStorage via zustand persist
      toast.success(`Welcome, ${data.user.name}! 🎯`)
      navigate(`/event/${data.event.id}`, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not join event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-white">ConnectQuest</h1>
          {event && <p className="text-white/80 mt-2 font-medium">{event.name}</p>}
          <p className="text-white/60 mt-1 text-sm">Enter your name to get your bingo card</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl animate-slide-up">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Your Name
              </label>
              <input
                className="input text-lg py-4 text-center font-medium"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary w-full text-lg py-4 rounded-2xl"
            >
              {loading ? 'Joining...' : '🚀 Join & Get Bingo Card'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-400">Already have an account?</p>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-brand-600 font-semibold hover:underline mt-1"
            >
              Sign in instead
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
