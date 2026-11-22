import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ChevronDown,
  ScreenShare,
  Sparkles,
  SwitchCamera,
  Video,
  X,
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import { VIDEO_FILTERS, filterCss } from '@/lib/filters'

const formatDuration = (total) => {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function CallAvatar({ name, src, color }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/20 text-3xl font-semibold ring-4 ring-emerald-300/20"
      style={color ? { backgroundImage: `linear-gradient(140deg, ${color}, #22d3ee88)` } : undefined}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  )
}

function DockButton({ icon: Icon, label, onClick, active = false, danger = false }) {
  return (
    <button type="button" onClick={onClick} className="flex w-[62px] flex-col items-center gap-1.5">
      <span
        className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          danger
            ? 'bg-red-500 shadow-[0_12px_30px_-8px_rgba(239,68,68,0.8)]'
            : active
              ? 'bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/60'
              : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="text-[10px] text-white/70">{label}</span>
    </button>
  )
}

export default function CallOverlay({
  incoming,
  call,
  localStream,
  remoteStream,
  facingMode,
  remoteFacingMode,
  videoFilter = 'none',
  remoteFilter = 'none',
  screenSharing = false,
  remoteSharing = false,
  minimized = false,
  notice,
  onMinimize,
  onRestore,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onSwitchCamera,
  onToggleScreenShare,
  onFilterChange,
}) {
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const [now, setNow] = useState(() => Date.now())
  const [filtersOpen, setFiltersOpen] = useState(false)

  const sharingRemote = Boolean(remoteSharing || call?.remoteSharing)
  const showVideo = Boolean(call?.withVideo || screenSharing || sharingRemote)

  useEffect(() => {
    if (!remoteStream) return
    const node = showVideo ? remoteVideoRef.current : remoteAudioRef.current
    if (node) {
      node.srcObject = remoteStream
      if ('playoutDelayHint' in node) node.playoutDelayHint = 0
    }
  }, [remoteStream, showVideo, minimized])

  useEffect(() => {
    if (!localStream || !showVideo || !localVideoRef.current) return
    localVideoRef.current.srcObject = localStream
  }, [localStream, showVideo, minimized])

  useEffect(() => {
    setFiltersOpen(false)
  }, [call?.callId])

  useEffect(() => {
    if (!call?.startedAt) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [call?.startedAt])

  useEffect(() => {
    if (!filtersOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  const active = Boolean(call || incoming)
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined
    let cancelled = false
    let sentinel = null
    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {}
    }
    acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (sentinel) sentinel.release().catch(() => {})
    }
  }, [active])

  if (!incoming && !call && !notice) return null

  const seconds = call?.startedAt ? Math.max(0, Math.floor((now - call.startedAt) / 1000)) : 0
  const callBackground =
    'bg-[radial-gradient(circle_at_50%_0%,#1d3b32_0%,#0d1a16_55%,#050a08_100%)]'

  return (
    <>
      {incoming && (
        <div
          className={`animate-fade-in fixed inset-0 z-[120] flex flex-col items-center justify-between px-6 py-14 text-white ${callBackground}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/60">
            ChatWave
          </p>

          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative grid place-items-center max-sm:-translate-y-4">
              <span className="call-ripple pointer-events-none absolute h-40 w-40 rounded-full border-2 border-emerald-300/45" />
              <span className="call-ripple-late pointer-events-none absolute h-40 w-40 rounded-full border-2 border-emerald-300/35" />
              <span className="call-ring pointer-events-none absolute h-44 w-44 rounded-full border border-emerald-300/20" />
              <div className="call-avatar-float">
                <CallAvatar
                  name={incoming.peerName}
                  src={incoming.avatarUrl}
                  color={incoming.avatarColor}
                />
              </div>
            </div>
            <h2 className="text-[30px] font-medium tracking-tight">{incoming.peerName}</h2>
            <p className="flex items-center gap-1.5 text-[13px] text-emerald-100/70">
              {incoming.withVideo ? <Video size={15} /> : <Mic size={15} />}
              <span className="animate-pulse">
                Incoming {incoming.withVideo ? 'video' : 'voice'} call...
              </span>
            </p>
          </div>

          <div className="flex w-full max-w-xs items-start justify-center gap-16">
            <button type="button" onClick={onDecline} className="flex flex-col items-center gap-2">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-[0_12px_30px_-8px_rgba(239,68,68,0.8)] transition-transform hover:scale-105">
                <PhoneOff size={26} />
              </span>
              <span className="text-[12px] text-white/70">Decline</span>
            </button>
            <button type="button" onClick={onAccept} className="flex flex-col items-center gap-2">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-[0_12px_30px_-8px_rgba(16,185,129,0.8)] transition-transform hover:scale-105">
                <Phone size={26} />
              </span>
              <span className="text-[12px] text-white/70">Answer</span>
            </button>
          </div>
        </div>
      )}

      {call && minimized && (
        <div className="animate-slide-down fixed inset-x-0 top-2 z-[125] mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-emerald-300/25 bg-[#101820]/95 px-2.5 py-2 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={onRestore}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <Avatar
              name={call.peerName}
              color={call.avatarColor}
              src={call.avatarUrl}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-white">
                {call.peerName}
              </span>
              <span className="block text-[10.5px] text-emerald-200/70">
                {screenSharing
                  ? 'Sharing screen'
                  : call.phase === 'connected'
                    ? `In call • ${formatDuration(seconds)}`
                    : call.phase === 'calling'
                      ? 'Calling...'
                      : 'Connecting...'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/20"
          >
            Open
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="grid h-8 w-8 place-items-center rounded-full bg-red-500 text-white transition-transform hover:scale-105"
            aria-label="End call"
          >
            <PhoneOff size={15} />
          </button>
        </div>
      )}

      {call && !minimized && (
        <div
          className={`animate-fade-in fixed inset-0 z-[120] flex flex-col items-center justify-center gap-8 px-6 py-10 text-white ${callBackground}`}
        >
          <button
            type="button"
            onClick={onMinimize}
            className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur transition-colors hover:bg-white/20"
            aria-label="Minimize call"
          >
            <ChevronDown size={15} />
            Minimize
          </button>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/60 ${
              showVideo ? 'max-sm:hidden' : ''
            }`}
          >
            {call.role === 'caller' ? 'Calling' : 'In call'}
          </p>

          {showVideo && (
            <div className="relative w-full max-w-3xl max-sm:fixed max-sm:inset-0 max-sm:z-0">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ filter: sharingRemote ? 'none' : filterCss(remoteFilter) }}
                className={`max-h-[64vh] w-full rounded-3xl bg-black object-contain shadow-2xl transition-[filter] duration-300 max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:rounded-none max-sm:object-cover max-sm:shadow-none ${
                  remoteFacingMode === 'user' && !screenSharing && !sharingRemote
                    ? '-scale-x-100'
                    : ''
                }`}
              />
              {localStream && localStream.getVideoTracks().length > 0 && (
                <div className="absolute bottom-28 right-3 max-sm:bottom-36">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ filter: screenSharing ? 'none' : filterCss(videoFilter) }}
                    className={`h-28 w-20 rounded-xl border border-white/15 bg-black object-cover shadow-lg transition-[filter] duration-300 max-sm:h-36 max-sm:w-24 ${
                      facingMode === 'user' && !screenSharing && !sharingRemote
                        ? '-scale-x-100'
                        : ''
                    }`}
                  />
                </div>
              )}
            </div>
          )}

          {!showVideo && (
            <>
              {remoteStream && <audio ref={remoteAudioRef} autoPlay playsInline />}
              <div className="relative grid place-items-center">
                {call.phase === 'calling' && (
                  <>
                    <span className="call-ripple pointer-events-none absolute h-36 w-36 rounded-full border-2 border-emerald-300/45" />
                    <span className="call-ripple-late pointer-events-none absolute h-36 w-36 rounded-full border-2 border-emerald-300/35" />
                  </>
                )}
                <span className="call-ring pointer-events-none absolute h-44 w-44 rounded-full border border-emerald-300/10" />
                <div className={call.phase === 'calling' ? 'call-avatar-float' : undefined}>
                  <CallAvatar
                    name={call.peerName}
                    src={call.avatarUrl}
                    color={call.avatarColor}
                  />
                </div>
              </div>
            </>
          )}

          <div className="text-center max-sm:absolute max-sm:bottom-[7.8rem] max-sm:left-0 max-sm:right-0 max-sm:z-10">
            <h2 className="text-[26px] font-medium tracking-tight drop-shadow-lg">{call.peerName}</h2>
            <p className="mt-1 text-[13px] text-emerald-100/70">
              {screenSharing
                ? 'Sharing your screen'
                : call.phase === 'connected'
                  ? formatDuration(seconds)
                  : call.phase === 'calling'
                    ? <span className="animate-pulse">Ringing...</span>
                    : 'Connecting...'}
            </p>
          </div>

          {filtersOpen && call.withVideo && (
            <div className="animate-pop-in absolute bottom-36 left-1/2 z-20 w-[min(92vw,400px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0d1218]/95 p-3 shadow-2xl backdrop-blur-xl max-sm:bottom-44">
              <div className="flex items-center justify-between px-1 pb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
                  Fun filters
                </p>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="text-white/60 transition-colors hover:text-white"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {VIDEO_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => onFilterChange(filter.id)}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-[11px] transition-colors ${
                      videoFilter === filter.id
                        ? 'border-emerald-300/60 bg-emerald-400/15 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-300 via-sky-300 to-fuchsia-400"
                      style={{ filter: filter.css }}
                    />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start justify-center gap-2 rounded-3xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl max-sm:absolute max-sm:bottom-5 max-sm:left-1/2 max-sm:z-20 max-sm:-translate-x-1/2">
            <DockButton
              icon={call.muted ? MicOff : Mic}
              label={call.muted ? 'Unmute' : 'Mute'}
              onClick={onToggleMute}
              active={call.muted}
            />
            {call.withVideo && !screenSharing && (
              <>
                <DockButton
                  icon={SwitchCamera}
                  label="Camera"
                  onClick={onSwitchCamera}
                />
                <DockButton
                  icon={Sparkles}
                  label="Filters"
                  onClick={() => setFiltersOpen((open) => !open)}
                  active={filtersOpen}
                />
              </>
            )}
            <DockButton
              icon={ScreenShare}
              label={screenSharing ? 'Stop share' : 'Share'}
              onClick={onToggleScreenShare}
              active={screenSharing}
            />
            <DockButton icon={PhoneOff} label="End" onClick={onEnd} danger />
          </div>
        </div>
      )}

      {notice && (
        <div className="animate-pop-in fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 rounded-full border border-white/10 bg-[#151827]/95 px-4 py-2 text-[12px] text-wa-text shadow-xl backdrop-blur">
          {notice}
        </div>
      )}
    </>
  )
}
