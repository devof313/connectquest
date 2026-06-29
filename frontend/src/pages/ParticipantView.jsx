import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import useAuthStore from '../store/authStore'
import { X, CheckCircle, Camera, Users, Trophy, Grid3X3, Maximize2, RefreshCw } from 'lucide-react'

const TABS = [
  { key: 'bingo', label: 'Bingo', icon: Grid3X3 },
  { key: 'connections', label: 'People', icon: Users },
  { key: 'leaderboard', label: 'Scores', icon: Trophy },
]

const medals = ['🥇', '🥈', '🥉']

export default function ParticipantView() {
  const { id } = useParams()
  const { user, refreshUser } = useAuthStore()
  const [tab, setTab] = useState('bingo')
  const [event, setEvent] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [bingoGrid, setBingoGrid] = useState([])
  const [connections, setConnections] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [bingoLines, setBingoLines] = useState([])
  const [showMyQR, setShowMyQR] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const leaderboardRef = useRef(null)
  const scannerRef = useRef(null)
  const scannerDivId = 'qr-scanner-div'

  // Guard against undefined user.id — critical for QR code correctness
  const myUserId = user?.id || ''

  useEffect(() => { loadAll() }, [id])
  useEffect(() => {
    if (tab === 'connections') loadConnections()
    if (tab === 'leaderboard') {
      loadLeaderboard()
      // Auto-refresh leaderboard every 60 seconds
      const interval = setInterval(() => {
        loadLeaderboard()
        setLastRefresh(new Date())
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [tab])

  // Track fullscreen state changes (e.g. user presses Esc)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const loadAll = async () => {
    try {
      const [evRes, epRes, chRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/me`),
        api.get(`/events/${id}/challenges`),
      ])
      setEvent(evRes.data)
      setParticipation(epRes.data)
      const cardIds = JSON.parse(epRes.data.bingo_card || '[]')
      const map = Object.fromEntries(chRes.data.map(c => [c.id, c]))
      const grid = cardIds.map(cid => map[cid]).filter(Boolean)
      setBingoGrid(grid)
      checkBingo(new Set(JSON.parse(epRes.data.completed_challenges || '[]')), grid)
    } catch {
      toast.error('Failed to load. Please refresh.')
    }
  }

  const loadConnections = () =>
    api.get(`/events/${id}/my-connections`).then(r => setConnections(r.data)).catch(() => {})

  const loadLeaderboard = () =>
    api.get(`/events/${id}/leaderboard`).then(r => { setLeaderboard(r.data); setLastRefresh(new Date()) }).catch(() => {})

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      leaderboardRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const checkBingo = (completed, grid) => {
    const lines = []
    const done = (i) => { const c = grid[i]; return c && completed.has(c.id) }
    for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => done(r*5+c))) lines.push(`row-${r}`)
    for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => done(r*5+c))) lines.push(`col-${c}`)
    if ([0,6,12,18,24].every(done)) lines.push('diag')
    if ([4,8,12,16,20].every(done)) lines.push('anti')
    setBingoLines(lines)
  }

  const completeChallenge = async (challenge, verifiedBy = null) => {
    setCompleting(true)
    try {
      const body = verifiedBy ? { verified_by: verifiedBy } : {}
      const { data } = await api.post(`/events/${id}/complete/${challenge.id}`, body)
      setParticipation(data.participant)
      const completed = new Set(JSON.parse(data.participant.completed_challenges || '[]'))
      checkBingo(completed, bingoGrid)
      const bonusMsg = data.connectionBonus ? ` +${data.connectionBonus} connection bonus!` : ''
      toast.success(`+${challenge.points} pts!${bonusMsg} ✅`)
      setSelectedChallenge(null)
      stopScanner()
      refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Already completed!')
    } finally {
      setCompleting(false)
    }
  }

  const startScanner = async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 300))
    try {
      // Lazy-load so Safari doesn't crash on import if camera API unavailable
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(scannerDivId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (text) => {
          const match = text.match(/connectquest:\/\/user\/(.+)/)
          if (match) {
            const scannedUserId = match[1]
            if (!scannedUserId || scannedUserId === 'undefined' || scannedUserId === myUserId) {
              toast.error(scannedUserId === myUserId ? "That's your own QR!" : 'Invalid QR code')
              return
            }
            stopScanner()
            await completeChallenge(selectedChallenge, scannedUserId)
          }
        },
        () => {}
      )
    } catch (e) {
      console.error('Scanner error:', e)
      toast.error('Camera not available. Try "Mark Complete" instead.')
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

  const closeModal = () => { stopScanner(); setSelectedChallenge(null) }

  if (!event || !participation) {
    return (
      <div style={{ minHeight: '100dvh' }} className="flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center px-6">
          <div className="text-6xl mb-4" style={{ animation: 'bounce 1s infinite' }}>🎯</div>
          <p className="text-gray-500 font-medium">Loading your bingo card...</p>
        </div>
      </div>
    )
  }

  const completed = new Set(JSON.parse(participation.completed_challenges || '[]'))
  const completedCount = completed.size
  const myRank = leaderboard.findIndex(l => l.user_id === user?.id)

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ minHeight: '100dvh' }}>

      {/* ── Header ── */}
      <div className="shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-3 pb-0">
          <div
            className="rounded-2xl p-4 text-white mb-3"
            style={{ background: `linear-gradient(135deg, ${event.theme_color || '#6366f1'}, ${event.theme_color || '#6366f1'}99)` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{event.event_type}</p>
                <h1 className="font-bold text-xl leading-tight mt-0.5 truncate">{event.name}</h1>
                <p className="text-white/75 text-sm mt-1 font-medium">👤 {user?.name}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold">⭐ {participation.points || 0} pts</span>
                  <span className="text-sm text-white/60">·</span>
                  <span className="text-sm text-white/80">{completedCount}/25 done</span>
                  {bingoLines.length > 0 && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      🎉 BINGO!
                    </span>
                  )}
                </div>
              </div>

              {/* QR button */}
              <button
                onClick={() => setShowMyQR(true)}
                className="shrink-0 bg-white/20 hover:bg-white/30 rounded-xl p-2.5 flex flex-col items-center gap-1 transition-colors"
              >
                <div className="bg-white rounded-lg p-1.5">
                  <QRCodeSVG value={`connectquest://user/${myUserId}`} size={52} level="M" />
                </div>
                <span className="text-[10px] text-white/70 font-medium">My QR</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3 bg-white/20 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === key
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400'
                    : 'text-gray-500'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

        {/* BINGO */}
        {tab === 'bingo' && (
          <div className="grid grid-cols-5 gap-1.5">
            {bingoGrid.map((challenge, i) => {
              const isDone = completed.has(challenge?.id)
              const isCenter = i === 12
              return (
                <button
                  key={challenge?.id || i}
                  onClick={() => !isDone && !isCenter && setSelectedChallenge(challenge)}
                  disabled={isDone || isCenter}
                  className={`rounded-xl flex flex-col items-center justify-center text-center transition-all border-2 ${
                    isCenter
                      ? 'bingo-cell-center border-transparent cursor-default'
                      : isDone
                      ? 'bingo-cell-complete border-transparent'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 active:scale-95'
                  }`}
                  style={{ aspectRatio: '1 / 1', padding: '4px' }}
                >
                  <span className="text-lg leading-none">
                    {isDone && !isCenter ? '✅' : (challenge?.icon || '🎯')}
                  </span>
                  <span className="text-[8px] font-semibold mt-0.5 leading-tight opacity-90 px-0.5"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {isCenter ? 'FREE' : challenge?.title}
                  </span>
                  {!isDone && !isCenter && (
                    <span className="text-[8px] font-bold text-brand-500 mt-0.5">{challenge?.points}pt</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* CONNECTIONS */}
        {tab === 'connections' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 font-medium">{connections.length} people you've met</p>
            {connections.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm">
                <div className="text-5xl mb-3">🤝</div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">No connections yet</p>
                <p className="text-sm text-gray-400 mt-1">Complete scan challenges to connect with people!</p>
              </div>
            ) : connections.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {[c.job_role, c.company].filter(Boolean).join(' · ') || 'No role listed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div ref={leaderboardRef} className={`space-y-2 ${isFullscreen ? 'bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto' : ''}`} style={isFullscreen ? { minHeight: '100vh' } : {}}>
            {/* Toolbar: refresh timestamp + fullscreen toggle */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · auto-refreshes every min` : 'Loading...'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadLeaderboard}
                  className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                  title="Refresh now"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 size={15} />
                </button>
              </div>
            </div>
            {myRank >= 0 && (
              <div className="bg-brand-50 dark:bg-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-2xl p-3 mb-4">
                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mb-0.5">YOUR RANK</p>
                <p className="font-bold text-brand-700 dark:text-brand-300 text-xl">
                  #{myRank + 1} · {participation.points} pts
                </p>
              </div>
            )}
            {leaderboard.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm text-gray-400">
                <Trophy size={36} className="mx-auto mb-2 opacity-30" />
                <p>Loading scores...</p>
              </div>
            ) : leaderboard.map((l, i) => (
              <div
                key={l.user_id}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm flex items-center gap-3 ${
                  l.user_id === user?.id ? 'ring-2 ring-brand-400' : ''
                }`}
              >
                <div className="w-9 text-center font-bold text-base shrink-0">
                  {i < 3 ? medals[i] : `#${i+1}`}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                  {l.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {l.name} {l.user_id === user?.id && <span className="text-xs text-brand-500">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{l.challenge_count} done · {l.connection_count} connections</p>
                </div>
                <p className="font-bold text-brand-600 dark:text-brand-400 shrink-0">{l.points}pt</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── My QR modal ── */}
      {showMyQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowMyQR(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-lg mb-1">{user?.name}</p>
            <p className="text-sm text-gray-500 mb-5">Show this QR to others to connect</p>
            <div className="flex justify-center mb-5">
              <div className="p-4 rounded-2xl shadow-md" style={{ background: '#ffffff', colorScheme: 'light' }}>
                <QRCodeSVG value={`connectquest://user/${myUserId}`} size={200} level="H" bgColor="#ffffff" fgColor="#000000" style={{ display: 'block' }} />
              </div>
            </div>
            <button onClick={() => setShowMyQR(false)} className="btn-secondary w-full">Close</button>
          </div>
        </div>
      )}

      {/* ── Challenge modal ── */}
      {selectedChallenge && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-3xl p-6"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-5" />

            {scanning ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl">Scan Their QR</h3>
                  <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600"><X size={22} /></button>
                </div>
                <p className="text-sm text-gray-500">Point camera at the other person's QR code</p>
                <div
                  id={scannerDivId}
                  className="w-full rounded-2xl overflow-hidden bg-gray-100"
                  style={{ minHeight: 240 }}
                />
                <button onClick={stopScanner} className="btn-secondary w-full py-3">Cancel</button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-5xl">{selectedChallenge.icon}</span>
                  <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600"><X size={22} /></button>
                </div>
                <h3 className="text-2xl font-bold">{selectedChallenge.title}</h3>
                <p className="text-gray-500 mt-2 mb-4">{selectedChallenge.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-sm px-3 py-1">
                    +{selectedChallenge.points} points
                  </span>
                  <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize text-sm px-3 py-1">
                    {selectedChallenge.challenge_type}
                  </span>
                </div>

                {selectedChallenge.requires_scan ? (
                  <button
                    onClick={startScanner}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base rounded-2xl"
                  >
                    <Camera size={20} /> Scan Their QR Code
                  </button>
                ) : (
                  <button
                    onClick={() => completeChallenge(selectedChallenge)}
                    disabled={completing}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base rounded-2xl"
                  >
                    <CheckCircle size={20} />
                    {completing ? 'Completing...' : 'Mark as Complete'}
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
