import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function JoinEvent() {
  const { code } = useParams()
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [event, setEvent] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate(`/login?redirect=/join/${code}`)
      return
    }
    api.post(`/events/join/${code}`)
      .then(({ data }) => {
        setEvent(data.event)
        setStatus('joined')
        toast.success(data.alreadyJoined ? 'Welcome back!' : 'Joined! 🎯')
        setTimeout(() => navigate(`/events/${data.event.id}/bingo`), 1500)
      })
      .catch(err => {
        setStatus('error')
        toast.error(err.response?.data?.error || 'Could not join')
      })
  }, [code, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-purple-600 p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <div className="text-5xl mb-4 animate-bounce">🎯</div>
            <h2 className="text-xl font-bold">Joining Event...</h2>
            <p className="text-gray-500 mt-2">Setting up your bingo card</p>
          </>
        )}
        {status === 'joined' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-600">You're in!</h2>
            <p className="text-gray-500 mt-2">Redirecting to your bingo card...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold">Could not join</h2>
            <p className="text-gray-500 mt-2">The event code may be invalid or the event is closed.</p>
            <Link to="/events" className="btn-primary mt-4 inline-block">Browse Events</Link>
          </>
        )}
      </div>
    </div>
  )
}
