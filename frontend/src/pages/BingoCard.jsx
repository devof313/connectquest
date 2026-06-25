import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { QrCode, CheckCircle, X, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'

export default function BingoCard() {
  const { id } = useParams()
  const { user, refreshUser } = useAuthStore()
  const [participation, setParticipation] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [bingoGrid, setBingoGrid] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [bingoLines, setBingoLines] = useState([])

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}/me`),
      api.get(`/events/${id}/challenges`),
    ]).then(([epRes, chRes]) => {
      setParticipation(epRes.data)
      const allChallenges = chRes.data
      setChallenges(allChallenges)
      const cardIds = JSON.parse(epRes.data.bingo_card || '[]')
      const challengeMap = Object.fromEntries(allChallenges.map(c => [c.id, c]))
      setBingoGrid(cardIds.map(cid => challengeMap[cid]).filter(Boolean))
    }).catch(() => toast.error('Failed to load bingo card'))
  }, [id])

  useEffect(() => {
    if (!participation || bingoGrid.length !== 25) return
    const completed = new Set(JSON.parse(participation.completed_challenges || '[]'))
    checkBingo(completed)
  }, [participation, bingoGrid])

  const checkBingo = (completed) => {
    const lines = []
    const isComplete = (idx) => {
      const c = bingoGrid[idx]
      return c && completed.has(c.id)
    }
    for (let r = 0; r < 5; r++) {
      if ([0,1,2,3,4].every(c => isComplete(r*5+c))) lines.push(`row-${r}`)
    }
    for (let c = 0; c < 5; c++) {
      if ([0,1,2,3,4].every(r => isComplete(r*5+c))) lines.push(`col-${c}`)
    }
    if ([0,6,12,18,24].every(isComplete)) lines.push('diag-main')
    if ([4,8,12,16,20].every(isComplete)) lines.push('diag-anti')
    setBingoLines(lines)
  }

  const completeChallenge = async (challenge) => {
    setCompleting(true)
    try {
      const { data } = await api.post(`/events/${id}/complete/${challenge.id}`)
      setParticipation(data.participant)
      toast.success(`+${challenge.points} pts! Challenge complete! 🎉`)
      setSelectedChallenge(null)
      refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete')
    } finally {
      setCompleting(false)
    }
  }

  if (!participation || bingoGrid.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400">Loading bingo card...</div>
  }

  const completed = new Set(JSON.parse(participation.completed_challenges || '[]'))
  const completedCount = completed.size
  const totalPoints = participation.points || 0

  return (
    <div className="space-y-4 animate-fade-in pb-20 md:pb-0">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bingo Card</h1>
          <p className="text-sm text-gray-500">{completedCount}/25 completed · {totalPoints} pts</p>
        </div>
        {bingoLines.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-xl font-bold animate-bounce text-lg">
            🎉 BINGO x{bingoLines.length}!
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="bg-gradient-to-r from-brand-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(completedCount / 25) * 100}%` }} />
      </div>

      {/* 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {bingoGrid.map((challenge, i) => {
          const isCompleted = completed.has(challenge?.id)
          const isCenter = i === 12
          return (
            <button
              key={challenge?.id || i}
              onClick={() => !isCompleted && setSelectedChallenge(challenge)}
              disabled={isCompleted || isCenter}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-center transition-all active:scale-95 border-2 ${
                isCenter ? 'bingo-cell-center border-transparent cursor-default' :
                isCompleted ? 'bingo-cell-complete border-transparent' :
                'card border-gray-100 dark:border-gray-700 hover:border-brand-400 hover:shadow-md cursor-pointer'
              }`}
            >
              <span className="text-xl leading-none">{isCompleted && !isCenter ? '✅' : challenge?.icon || '🎯'}</span>
              <span className="text-[9px] font-medium mt-0.5 leading-tight line-clamp-2 px-0.5 opacity-90">
                {isCenter ? 'FREE' : challenge?.title}
              </span>
              {!isCompleted && !isCenter && (
                <span className="text-[8px] font-bold text-brand-500 mt-0.5">{challenge?.points}pt</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Challenge detail modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedChallenge(null)}>
          <div className="card w-full max-w-sm p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{selectedChallenge.icon}</div>
              <button onClick={() => setSelectedChallenge(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold">{selectedChallenge.title}</h3>
            <p className="text-gray-500 mt-1 mb-4">{selectedChallenge.description}</p>
            <div className="flex items-center gap-2 mb-5">
              <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">+{selectedChallenge.points} points</span>
              <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 capitalize">{selectedChallenge.challenge_type}</span>
              {selectedChallenge.requires_scan ? <span className="badge bg-purple-100 text-purple-700">Requires QR Scan</span> : null}
            </div>
            {selectedChallenge.requires_scan ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Ask the other person to show their QR code, then scan it to validate.</p>
                <button className="btn-primary w-full flex items-center justify-center gap-2">
                  <Camera size={16} /> Scan Their QR Code
                </button>
                <button onClick={() => completeChallenge(selectedChallenge)} disabled={completing} className="btn-secondary w-full text-sm">
                  {completing ? 'Completing...' : 'Mark Complete Manually'}
                </button>
              </div>
            ) : (
              <button onClick={() => completeChallenge(selectedChallenge)} disabled={completing} className="btn-primary w-full flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {completing ? 'Completing...' : 'Mark as Complete'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bingo-cell-complete inline-block" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bingo-cell-center inline-block" /> Free Space</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border-2 border-gray-200 inline-block" /> Tap to complete</span>
      </div>
    </div>
  )
}
