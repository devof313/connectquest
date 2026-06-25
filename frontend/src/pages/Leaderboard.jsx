import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Trophy, Users, Zap } from 'lucide-react'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/events/${id}/leaderboard`).then(r => {
      setLeaders(r.data)
      const rank = r.data.findIndex(l => l.user_id === user?.id)
      setMyRank(rank >= 0 ? rank + 1 : null)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>

  const me = leaders.find(l => l.user_id === user?.id)

  return (
    <div className="space-y-5 animate-fade-in pb-20 md:pb-0">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-500" /> Leaderboard</h1>

      {/* My stats */}
      {me && (
        <div className="card p-4 border-2 border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20">
          <p className="text-xs text-brand-600 font-semibold mb-1">YOUR RANK</p>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-brand-600">#{myRank}</div>
            <div>
              <p className="font-bold">{me.name}</p>
              <p className="text-sm text-gray-500">{me.points} pts · {me.challenge_count} challenges · {me.connection_count} connections</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-3 pt-2">
          {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
            const heights = ['h-24', 'h-32', 'h-20']
            const ranks = [2, 1, 3]
            return (
              <div key={l.user_id} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {l.name?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-center truncate w-full px-1">{l.name}</p>
                <div className={`w-full ${heights[i]} rounded-t-xl flex flex-col items-center justify-center text-white font-bold`}
                  style={{ background: i === 1 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : i === 0 ? 'linear-gradient(135deg,#9ca3af,#6b7280)' : 'linear-gradient(135deg,#b45309,#92400e)' }}>
                  <span className="text-2xl">{medals[ranks[i]-1]}</span>
                  <span className="text-sm">{l.points}pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {leaders.map((l, i) => (
          <div key={l.user_id} className={`card p-3 flex items-center gap-3 ${l.user_id === user?.id ? 'border-2 border-brand-400' : ''}`}>
            <div className="w-8 text-center font-bold text-gray-500">
              {i < 3 ? medals[i] : `#${i+1}`}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
              {l.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{l.name} {l.user_id === user?.id && <span className="text-xs text-brand-600">(you)</span>}</p>
              <p className="text-xs text-gray-500 truncate">{l.company || 'No company'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-brand-600">{l.points} pts</p>
              <p className="text-xs text-gray-500">{l.challenge_count} done · {l.connection_count} connects</p>
            </div>
          </div>
        ))}
      </div>

      {leaders.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <Trophy size={40} className="mx-auto mb-2 opacity-30" />
          <p>No participants yet</p>
        </div>
      )}
    </div>
  )
}
