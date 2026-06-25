import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Link2 } from 'lucide-react'
import api from '../utils/api'

export default function Connections() {
  const { id } = useParams()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/events/${id}/my-connections`).then(r => setConnections(r.data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users /> Connections</h1>
        <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-sm px-3 py-1">{connections.length} people</span>
      </div>

      {connections.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-5xl mb-3">🤝</div>
          <p className="font-medium">No connections yet</p>
          <p className="text-sm mt-1">Complete bingo challenges to connect with people!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {connections.map(c => (
            <div key={c.id} className="card p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{c.name}</p>
                <p className="text-sm text-gray-500">{c.job_role} {c.company ? `at ${c.company}` : ''}</p>
                {c.linkedin && (
                  <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 flex items-center gap-1 mt-1 hover:underline">
                    <Link2 size={12} /> LinkedIn
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 shrink-0">{new Date(c.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
