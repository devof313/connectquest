import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../utils/api'
import useAuthStore from '../store/authStore'
import { X, CheckCircle, Camera, Users, Trophy, Grid3X3, QrCode } from 'lucide-react'

const TABS = [
  { key: 'bingo', label: 'Bingo', icon: Grid3X3 },
  { key: 'connections', label: 'Connections', icon: Users },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
]

const medals = ['🥇', '🥈', '🥉']

export default function ParticipantView() {
  const { id } = useParams()
  const { user, refreshUser } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('bingo')
  const [event, setEvent] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [bingoGrid, setBingoGrid] = useState([])
  const [connections, setConnections] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [bingoLines, setBingoLines] = useState([])
  const scannerRef = useRef(null)
  const scannerDivId = 'qr-scanner-div'

  useEffect(() => {
    loadAll()
  }, [id])

  useEffect(() => {
    if (tab === 'connections') loadConnections()
    if (tab === 'leaderboard') loadLeaderboard()
  }, [tab])

  const loadAll = async () => {
    try {
      const [evRes, epRes, chRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/me`),
        api.get(`/events/${id}/challenges`),
      ])
      setEvent(evRes.data)
      setParticipation(epRes.data)
      const allChallenges = chRes.data
      setChallenges(allChallenges)
      const cardIds = JSON.parse(epRes.data.bingo_card || '[]')
      const map = Object.fromEntries(allChallenges.map(c => [c.id, c]))
      const grid = cardIds.map(cid => map[cid]).filter(Boolean)
      setBingoGrid(grid)
      checkBingo(new Set(JSON.parse(epRes.data.completed_challenges || '[]')), grid)
    } catch {
      toast.error('Failed to load event')
    }
  }

  const loadConnections = () => {
    api.get(`/events/${id}/my-connections`).then(r => setConnections(r.data)).catch(() => {})
  }

  const loadLeaderboard = () => {
    api.get(`/events/${id}/leaderboard`).then(r => setLeaderboard(r.data)).catch(() => {})
  }

  const checkBingo = (completed, grid) => {
    const lines = []
    const done = (i) => { const c = grid[i]; return c && completed.has(c.id) }
    for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => done(r*5+c))) lines.push(`row-${r}`)
    for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => done(r*5+c))) lines.push(`col-${c}`)
    if ([0,6,12,18,24].every(done)) lines.push('diag-main')
    if ([4,8,12,16,20].every(done)) lines.push('diag-anti')
    setBingoLines(lines)
  }

  const completeChallenge = async (challenge, verifiedBy = null) => {
    setCompleting(true)
    try {
      const { data } = await api.post(`/events/${id}/complete/${challenge.id}`, verifiedBy ? { verified_by: verifiedBy } : {})
      setParticipation(data.participant)
      const completed = new Set(JSON.parse(data.participant.completed_challenges || '[]'))
      checkBingo(completed, bingoGrid)
      toast.success(`+${challenge.points} pts! ✅`)
      setSelectedChallenge(null)
      stopScanner()
      refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Already completed or failed')
    } finally {
      setCompleting(false)
    }
  }

  const startScanner = async () => {
    setScanning(true)
    // Wait for DOM
    await new Promise(r => setTimeout(r, 200))
    try {
      const scanner = new Html5Qrcode(scannerDivId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          // decodedText = "connectquest://user/USER_ID"
          const match = decodedText.match(/connectquest:\/\/user\/(.+)/)
          if (match) {
            const scannedUserId = match[1]
            if (scannedUserId === user?.id) {
              toast.error("That's your own QR code!")
              return
            }
            stopScanner()
            await completeChallenge(selectedChallenge, scannedUserId)
          }
        },
        () => {} // ignore errors
      )
    } catch {
      toast.error('Camera not available. Try granting camera permission.')
      setScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  const closeModal = () => {
    stopScanner()
    setSelectedChallenge(null)
  }

  if (!event || !participation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🎯</div>
          <p className="text-gray-500">Loading your bingo card...</p>
        </div>
      </div>
    )
  }

  const completed = new Set(JSON.parse(participation.completed_challenges || '[]'))
  const completedCount = completed.size
  const myRank = leaderboard.findIndex(l => l.user_id === user?.id) + 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col max-w-lg mx-auto">
      {/* Event header + My QR */}
      <div className="p-4 pb-0">
        <div className="rounded-2xl text-white p-4 mb-4" style={{ background: `linear-gradient(135deg, ${event.theme_color || '#6366f1'}, ${event.theme_color || '#6366f1'}bb)` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/60 uppercase tracking-wide">{event.event_type}</p>
              <h1 className="font-bold text-lg leading-tight truncate">{event.name}</h1>
              <p className="text-white/70 text-sm mt-1">👋 {user?.name} · ⭐ {participation.points || 0} pts</p>
              {bingoLines.length > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full animate-bounce">
                  🎉 BINGO x{bingoLines.length}!
                </div>
              )}
            </div>
            {/* My QR */}
            <div className="shrink-0 text-center">
              <div className="bg-white p-1.5 rounded-xl">
                <QRCodeSVG value={`connectquest://user/${user?.id}`} size={72} level="M" />
              </div>
              <p className="text-[10px] text-white/60 mt-1">My QR</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-brand-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(completedCount / 25) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-500">{completedCount}/25</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-4 pb-6">

        {/* BINGO TAB */}
        {tab === 'bingo' && (
          <div className="grid grid-cols-5 gap-1">
            {bingoGrid.map((challenge, i) => {
              const isDone = completed.has(challenge?.id)
              const isCenter = i === 12
              return (
                <button key={challenge?.id || i}
                  onClick={() => !isDone && !isCenter && setSelectedChallenge(challenge)}
                  disabled={isDone || isCenter}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 text-center transition-all active:scale-95 border-2 ${
                    isCenter ? 'bingo-cell-center border-transparent cursor-default' :
                    isDone ? 'bingo-cell-complete border-transparent' :
                    'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-400 hover:shadow-md cursor-pointer'
                  }`}>
                  <span className="text-lg leading-none">{isDone && !isCenter ? '✅' : challenge?.icon || '🎯'}</span>
                  <span className="text-[8px] font-medium mt-0.5 leading-tight line-clamp-2 opacity-90">
                    {isCenter ? 'FREE' : challenge?.title}
                  </span>
                  {!isDone && !isCenter && (
                    <span className="text-[8px] font-bold text-brand-500">{challenge?.points}pt</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {tab === 'connections' && (
          <div className="space-y-3">
            {connections.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">
                <div className="text-5xl mb-2">🤝</div>
                <p className="font-medium">No connections yet</p>
                <p className="text-sm mt-1">Complete scan challenges to connect!</p>
              </div>
            ) : connections.map(c => (
              <div key={c.id} className="card p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate">{c.job_role || ''}{c.company ? ` · ${c.company}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {myRank > 0 && (
              <div className="card p-3 border-2 border-brand-300 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/20 mb-3">
                <p className="text-xs text-brand-600 font-bold mb-0.5">YOUR RANK</p>
                <p className="font-bold text-brand-700 dark:text-brand-300 text-lg">#{myRank} · {participation.points} pts</p>
              </div>
            )}
            {leaderboard.map((l, i) => (
              <div key={l.user_id} className={`card p-3 flex items-center gap-3 ${l.user_id === user?.id ? 'border-2 border-brand-400' : ''}`}>
                <div className="w-8 text-center font-bold text-gray-500 shrink-0">
                  {i < 3 ? medals[i] : `#${i+1}`}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {l.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{l.name} {l.user_id === user?.id && <span className="text-xs text-brand-500">(you)</span>}</p>
                  <p className="text-xs text-gray-400">{l.challenge_count} challenges · {l.connection_count} connects</p>
                </div>
                <p className="font-bold text-brand-600 shrink-0">{l.points}pts</p>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="card p-10 text-center text-gray-400">
                <Trophy size={40} className="mx-auto mb-2 opacity-30" />
                <p>Leaderboard loading...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Challenge modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {scanning ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Scan Their QR Code</h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
                </div>
                <p className="text-sm text-gray-500">Point your camera at the other person's QR code</p>
                <div id={scannerDivId} className="w-full rounded-2xl overflow-hidden" style={{ minHeight: 260 }} />
                <button onClick={stopScanner} className="btn-secondary w-full">Cancel Scan</button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-5xl">{selectedChallenge.icon}</div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 mt-1"><X size={22} /></button>
                </div>
                <h3 className="text-xl font-bold">{selectedChallenge.title}</h3>
                <p className="text-gray-500 mt-1 mb-4 text-sm">{selectedChallenge.description}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">+{selectedChallenge.points} pts</span>
                  <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 capitalize">{selectedChallenge.challenge_type}</span>
                  {selectedChallenge.requires_scan ? <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">📷 Requires scan</span> : null}
                </div>
                {selectedChallenge.requires_scan ? (
                  <div className="space-y-3">
                    <button onClick={startScanner} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                      <Camera size={18} /> Scan Their QR Code
                    </button>
                    <button onClick={() => completeChallenge(selectedChallenge)} disabled={completing} className="btn-secondary w-full text-sm">
                      {completing ? 'Completing...' : 'Mark Complete Without Scan'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => completeChallenge(selectedChallenge)} disabled={completing} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                    <CheckCircle size={18} /> {completing ? 'Completing...' : 'Mark as Complete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
