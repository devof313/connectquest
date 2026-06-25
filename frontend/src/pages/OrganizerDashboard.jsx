import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Users, Zap, Link2, BarChart2, Plus, Download } from 'lucide-react'

export default function OrganizerDashboard() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [participants, setParticipants] = useState([])
  const [challenges, setChallenges] = useState([])
  const [tab, setTab] = useState('overview')
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', icon: '🎯', points: 10, challenge_type: 'networking', requires_scan: false })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api.get(`/events/${id}`).then(r => setEvent(r.data))
    api.get(`/events/${id}/analytics`).then(r => setAnalytics(r.data))
    api.get(`/events/${id}/participants`).then(r => setParticipants(r.data))
    api.get(`/events/${id}/challenges`).then(r => setChallenges(r.data))
  }, [id])

  const addChallenge = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      const { data } = await api.post(`/events/${id}/challenges`, { ...newChallenge, requires_scan: newChallenge.requires_scan ? 1 : 0 })
      setChallenges(p => [...p, data])
      setNewChallenge({ title: '', description: '', icon: '🎯', points: 10, challenge_type: 'networking', requires_scan: false })
      toast.success('Challenge added!')
    } catch {
      toast.error('Failed to add challenge')
    } finally {
      setAdding(false)
    }
  }

  const exportCSV = () => {
    const rows = [['Name', 'Company', 'Role', 'Points', 'Joined'].join(',')]
    participants.forEach(p => rows.push([p.name, p.company, p.job_role, p.points, p.joined_at].map(v => `"${v || ''}"`).join(',')))
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${event?.name || 'event'}-participants.csv`; a.click()
  }

  if (!event) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>

  const tabs = ['overview', 'challenges', 'participants', 'qrcode']

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-gray-500">Event Management Dashboard</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'qrcode' ? 'QR Code' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Participants', value: analytics.totalParticipants, icon: '👥', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
              { label: 'Connections', value: analytics.totalConnections, icon: '🤝', color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
              { label: 'Completions', value: analytics.totalCompletions, icon: '✅', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
              { label: 'Challenges', value: challenges.length, icon: '🎯', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' },
            ].map(s => (
              <div key={s.label} className={`card p-4 ${s.color}`}>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm font-medium mt-1 opacity-70">{s.icon} {s.label}</p>
              </div>
            ))}
          </div>
          <div className="card p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart2 size={16} /> Top Challenges</h3>
            <div className="space-y-2">
              {analytics.challengeStats?.slice(0, 8).map(c => (
                <div key={c.title} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{c.title}</span>
                  <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: analytics.totalCompletions > 0 ? `${(c.completions / analytics.totalCompletions) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-8 text-right">{c.completions}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold mb-3">🏆 Top Participants</h3>
            {analytics.topParticipants?.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b dark:border-gray-700 last:border-0">
                <span className="text-lg">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-sm text-gray-500">{p.company}</span>
                <span className="font-bold text-brand-600">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Add Custom Challenge</h3>
            <form onSubmit={addChallenge} className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <input className="input col-span-1 text-center text-2xl" placeholder="🎯" value={newChallenge.icon} onChange={e => setNewChallenge(p => ({ ...p, icon: e.target.value }))} />
                <input className="input col-span-3" placeholder="Challenge title" value={newChallenge.title} onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <input className="input" placeholder="Description" value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="input" placeholder="Points" min={1} value={newChallenge.points} onChange={e => setNewChallenge(p => ({ ...p, points: +e.target.value }))} />
                <select className="input" value={newChallenge.challenge_type} onChange={e => setNewChallenge(p => ({ ...p, challenge_type: e.target.value }))}>
                  {['networking','teambuilding','learning','fun','special','sponsor'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newChallenge.requires_scan} onChange={e => setNewChallenge(p => ({ ...p, requires_scan: e.target.checked }))} className="rounded" />
                Requires QR scan to complete
              </label>
              <button type="submit" disabled={adding} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> {adding ? 'Adding...' : 'Add Challenge'}
              </button>
            </form>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">All Challenges ({challenges.length})</h3>
            {challenges.map(c => (
              <div key={c.id} className="card p-3 flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs text-gray-500 truncate">{c.description}</p>
                </div>
                <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shrink-0">{c.points}pt</span>
                {c.requires_scan ? <span className="text-xs text-purple-500">📷</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'participants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{participants.length} participants</p>
            <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-2">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.id} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                  {p.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate">{p.job_role || 'No role'} {p.company ? `· ${p.company}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-brand-600 text-sm">{p.points} pts</p>
                  <p className="text-xs text-gray-400">{p.connections} connects</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'qrcode' && (
        <div className="card p-6 flex flex-col items-center gap-4">
          <h3 className="font-semibold text-lg">Event Join QR Code</h3>
          <div className="p-5 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG value={`${window.location.origin}/join/${event.join_code}`} size={220} level="H" />
          </div>
          <div className="text-center">
            <p className="font-mono text-3xl font-bold tracking-widest text-brand-600">{event.join_code}</p>
            <p className="text-sm text-gray-500 mt-1">Attendees scan this or enter the code to join</p>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg font-mono">
            {window.location.origin}/join/{event.join_code}
          </p>
        </div>
      )}
    </div>
  )
}
