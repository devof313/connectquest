import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Plus } from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6']
const EVENT_TYPES = ['conference', 'hackathon', 'corporate', 'university', 'networking', 'startup']

export default function CreateEvent() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', description: '', event_type: 'conference', location: '',
    start_date: '', end_date: '', max_participants: 200, theme_color: '#6366f1'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/events', form)
      toast.success('Event created! 🎉')
      navigate(`/events/${data.id}/manage`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Plus /> Create Event</h1>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Event Name *</label>
            <input className="input" placeholder="TechConnect 2024" value={form.name} onChange={f('name')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Tell attendees what this event is about..." value={form.description} onChange={f('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Event Type</label>
              <select className="input" value={form.event_type} onChange={f('event_type')}>
                {EVENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Max Participants</label>
              <input type="number" className="input" min={1} max={10000} value={form.max_participants} onChange={f('max_participants')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Date</label>
              <input type="datetime-local" className="input" value={form.start_date} onChange={f('start_date')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Date</label>
              <input type="datetime-local" className="input" value={form.end_date} onChange={f('end_date')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input className="input" placeholder="San Francisco, CA or Virtual" value={form.location} onChange={f('location')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Theme Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, theme_color: c }))}
                  className={`w-9 h-9 rounded-full transition-all ${form.theme_color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading ? 'Creating...' : '✨ Create Event & Generate QR Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
