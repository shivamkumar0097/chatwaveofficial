import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { startRingtone, stopRingtone } from '@/lib/sound'

const ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
]

const PEER_CONFIG = {
  iceServers: ICE_SERVERS,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
}

const VIDEO_LIMITS = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 24, max: 30 },
}

const videoConstraints = (mode) => ({ ...VIDEO_LIMITS, facingMode: { ideal: mode } })

if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
  })
}

const makeCallId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const displayNameOf = (user) =>
  user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone'

const descriptionOf = (description) => ({ type: description.type, sdp: description.sdp })

const historyKey = (userId) => `cw-calls:${userId}`

const readHistory = (userId) => {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(historyKey(userId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeHistory = (userId, entries) => {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(historyKey(userId), JSON.stringify(entries.slice(0, 100)))
}

let moduleActiveCall = false

const closeStaleOngoingNotifications = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => window.setTimeout(() => resolve(null), 800)),
    ])
    if (!registration) return
    const list = await registration.getNotifications({ tag: 'cw-ongoing-call' })
    list.forEach((item) => item.close())
  } catch {}
}

if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.setTimeout(() => {
    if (!moduleActiveCall) closeStaleOngoingNotifications()
  }, 600)
}

export function useCall(user) {
  const [incoming, setIncoming] = useState(null)
  const [call, setCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [facingMode, setFacingMode] = useState('user')
  const [remoteFacingMode, setRemoteFacingMode] = useState('environment')
  const [videoFilter, setVideoFilter] = useState('none')
  const [remoteFilter, setRemoteFilter] = useState('none')
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteSharing, setRemoteSharing] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState(() => readHistory(user?.id))

  const historyRef = useRef(history)
  const historyIdRef = useRef(null)
  const patchEntryRef = useRef(null)
  const pushEntryRef = useRef(null)
  const callRef = useRef(null)
  const incomingRef = useRef(null)
  const pcRef = useRef(null)
  const localRef = useRef(null)
  const facingModeRef = useRef('user')
  const switchingRef = useRef(false)
  const screenSharingRef = useRef(false)
  const remoteSharingRef = useRef(false)
  const minimizedRef = useRef(false)
  const overlayEntryRef = useRef(false)
  const overlayDepthRef = useRef(0)
  const unwindingRef = useRef(false)
  const cleanupRef = useRef(null)
  const screenTrackRef = useRef(null)
  const cameraTrackRef = useRef(null)
  const stopScreenRef = useRef(null)
  const peerChannelsRef = useRef(new Map())
  const pendingIceRef = useRef([])
  const timerRef = useRef(null)
  const noticeTimerRef = useRef(null)
  const signalHandlerRef = useRef(null)
  const inviteCallIdRef = useRef(null)
  const acceptCallRef = useRef(null)
  const startCallRef = useRef(null)

  const clearInvite = useCallback((callId) => {
    if (!callId || !supabase) return
    supabase.from('call_invites').delete().eq('call_id', callId).then(() => {}).catch(() => {})
  }, [])

  const notifyIncoming = useCallback(async (offer) => {
    if (!document.hidden || !('Notification' in window) || !('serviceWorker' in navigator)) return
    let permission = Notification.permission
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission()
      } catch {}
    }
    if (permission !== 'granted') return
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(offer.peerName || 'Incoming call', {
        body: offer.withVideo ? 'Incoming video call' : 'Incoming voice call',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `cw-call-${offer.callId}`,
        renotify: true,
        requireInteraction: true,
        data: {
          url: `/?call=${encodeURIComponent(offer.callId)}&caller=${encodeURIComponent(offer.peerId)}`,
        },
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' },
        ],
      })
    } catch {}
  }, [])

  const showMissedNotification = useCallback(
    async ({ callId, peerId, peerName, conversationId, outgoing = false }) => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return
      if (Notification.permission !== 'granted') return
      try {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => window.setTimeout(() => resolve(null), 800)),
        ])
        if (!registration) return
        const query = new URLSearchParams({
          missed: callId,
          peer: peerId || '',
          conv: conversationId || '',
          name: peerName || '',
        })
        await registration.showNotification('Missed call', {
          body: outgoing ? `No answer from ${peerName || 'Someone'}` : `Missed call from ${peerName || 'Someone'}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `cw-call-${callId}`,
          renotify: true,
          data: {
            url: `/?${query.toString()}`,
            chatUrl: conversationId ? `/?chat=${encodeURIComponent(conversationId)}` : '/',
          },
          actions: [
            { action: 'callback', title: 'Call back' },
            { action: 'message', title: 'Message' },
          ],
        })
      } catch {}
    },
    []
  )

  const showIncoming = useCallback((offer) => {
    if (callRef.current || incomingRef.current) return false
    incomingRef.current = offer
    notifyIncoming(offer)
    setRemoteFacingMode(offer.facingMode === 'user' ? 'user' : 'environment')
    startRingtone()
    setIncoming({
      callId: offer.callId,
      conversationId: offer.conversationId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: offer.withVideo,
    })
    return true
  }, [notifyIncoming])

  const showNotice = useCallback((message) => {
    setNotice(message)
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3600)
  }, [])

  const showOngoingNotification = useCallback(async (info) => {
    if (
      !info ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted' ||
      !('serviceWorker' in navigator)
    ) return
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(
        info.phase === 'connected' ? `In call with ${info.peerName}` : `Calling ${info.peerName}...`,
        {
          body: info.withVideo ? 'Video call • tap to return' : 'Voice call • tap to return',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'cw-ongoing-call',
          renotify: false,
          requireInteraction: true,
          silent: true,
          data: { callUi: 'restore', url: '/' },
        }
      )
    } catch {}
  }, [])

  const clearOngoingNotification = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return
    try {
      const registration = await navigator.serviceWorker.ready
      const list = await registration.getNotifications({ tag: 'cw-ongoing-call' })
      list.forEach((item) => item.close())
    } catch {}
  }, [])

  const sendSignal = useCallback(
    async (peerId, payload) => {
      if (!user || !peerId || !supabase) return
      let channel = peerChannelsRef.current.get(peerId)
      if (!channel) {
        channel = supabase.channel(`calls:${peerId}`, { config: { broadcast: { self: false } } })
        await new Promise((resolve) => {
          let done = false
          const finish = () => {
            if (!done) {
              done = true
              resolve()
            }
          }
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') finish()
          })
          window.setTimeout(finish, 3000)
        })
        peerChannelsRef.current.set(peerId, channel)
      }
      const result = await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...payload, from: user.id, to: peerId },
      })
      return result === 'ok'
    },
    [user]
  )

  const pushOverlayEntry = useCallback(() => {
    if (typeof window === 'undefined' || unwindingRef.current || overlayEntryRef.current) return
    if (window.history.state?.cwCallOverlay) {
      overlayDepthRef.current = Math.max(overlayDepthRef.current, 1)
      overlayEntryRef.current = true
      return
    }
    const depth = overlayDepthRef.current + 1
    window.history.pushState({ cwCallOverlay: true, cwDepth: depth }, '')
    overlayDepthRef.current = depth
    overlayEntryRef.current = true
  }, [])

  const unwindOverlayEntry = useCallback(() => {
    if (typeof window === 'undefined') return
    const depth = overlayDepthRef.current
    overlayDepthRef.current = 0
    overlayEntryRef.current = false
    if (depth > 0 && window.history.state?.cwCallOverlay) {
      unwindingRef.current = true
      window.history.go(-depth)
      window.setTimeout(() => {
        unwindingRef.current = false
      }, 500)
      return
    }
    if (window.history.state?.cwCallOverlay) window.history.replaceState({}, '')
  }, [])

  const cleanup = useCallback(
    (notifyPeer = false) => {
      stopRingtone()
      if (historyIdRef.current) {
        const entry = historyRef.current.find((item) => item.id === historyIdRef.current)
        if (entry) {
          patchEntryRef.current?.(entry.id, {
            duration: entry.connectedAt
              ? Math.floor((Date.now() - entry.connectedAt) / 1000)
              : 0,
            status: entry.connectedAt
              ? 'completed'
              : entry.direction === 'outgoing'
                ? 'no_answer'
                : 'missed',
          })
        }
        historyIdRef.current = null
      }
      const current = callRef.current
      if (notifyPeer && current) {
        sendSignal(current.peerId, { type: 'end', callId: current.callId })
      }
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
      if (pcRef.current) pcRef.current.close()
      pcRef.current = null
      if (localRef.current) localRef.current.getTracks().forEach((track) => track.stop())
      localRef.current = null
      if (screenTrackRef.current) {
        try { screenTrackRef.current.stop() } catch {}
        screenTrackRef.current = null
      }
      cameraTrackRef.current = null
      screenSharingRef.current = false
      setScreenSharing(false)
      remoteSharingRef.current = false
      setRemoteSharing(false)
      minimizedRef.current = false
      setMinimized(false)
      setVideoFilter('none')
      setRemoteFilter('none')
      clearOngoingNotification()
      unwindOverlayEntry()
      pendingIceRef.current = []
      incomingRef.current = null
      callRef.current = null
      setIncoming(null)
      setCall(null)
      clearInvite(inviteCallIdRef.current)
      inviteCallIdRef.current = null
      setLocalStream(null)
      setRemoteStream(null)
      facingModeRef.current = 'user'
      setFacingMode('user')
      setRemoteFacingMode('environment')
    },
    [sendSignal, clearInvite, clearOngoingNotification, unwindOverlayEntry]
  )

  const patchCall = useCallback((patch) => {
    setCall((prev) => {
      if (!prev) return prev
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      callRef.current = next
      return next
    })
  }, [])

  const preparePeer = useCallback(async () => {
    const pc = new RTCPeerConnection(PEER_CONFIG)
    pcRef.current = pc

    pc.onicecandidate = (event) => {
      const current = callRef.current
      if (event.candidate && current) {
        sendSignal(current.peerId, {
          type: 'ice',
          callId: current.callId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      if (event.streams?.[0]) setRemoteStream(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        stopRingtone()
        patchEntryRef.current?.(historyIdRef.current, { status: 'completed', connectedAt: Date.now() })
        patchCall((prev) =>
          prev.phase === 'connected'
            ? prev
            : { ...prev, phase: 'connected', startedAt: prev.startedAt || Date.now() }
        )
      }
    }

    if (localRef.current) {
      for (const track of localRef.current.getTracks()) pc.addTrack(track, localRef.current)
    }
    return pc
  }, [sendSignal, patchCall])

  const applyPendingIce = useCallback(async (pc) => {
    for (const candidate of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {}
    }
    pendingIceRef.current = []
  }, [])

  const sendRenegotiateOffer = useCallback(async () => {
    const pc = pcRef.current
    const current = callRef.current
    if (!pc || !current || pc.signalingState !== 'stable') return false
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sent = await sendSignal(current.peerId, {
        type: 'renegotiate',
        callId: current.callId,
        sdp: descriptionOf(pc.localDescription),
      })
      return Boolean(sent)
    } catch {
      return false
    }
  }, [sendSignal])

  const videoSenderOf = useCallback((pc) => {
    const byTrack = pc.getSenders().find((sender) => sender.track?.kind === 'video')
    if (byTrack) return byTrack
    const transceiver = pc.getTransceivers?.().find(
      (item) => item.receiver?.track?.kind === 'video'
    )
    return transceiver?.sender || null
  }, [])

  const replaceVideoTrack = useCallback(
    async (track) => {
      const pc = pcRef.current
      if (!pc || pc.signalingState === 'closed') return false
      const sender = videoSenderOf(pc)
      try {
        if (sender) {
          await sender.replaceTrack(track)
        } else if (track) {
          const grouped = new MediaStream([...(localRef.current?.getAudioTracks() || []), track])
          pc.addTrack(track, grouped)
          const sent = await sendRenegotiateOffer()
          if (!sent) return false
        } else {
          return false
        }
        return true
      } catch {
        return false
      }
    },
    [sendRenegotiateOffer, videoSenderOf]
  )

  const handleSignal = useCallback(
    async (payload) => {
      if (!user || !payload || payload.to !== user.id) return
      const current = callRef.current
      const type = payload.type

      if (type === 'offer') {
        if (incomingRef.current?.callId === payload.callId) return
        if (current || incomingRef.current) {
          await sendSignal(payload.from, { type: 'busy', callId: payload.callId })
          pushEntryRef.current?.({
            id: makeCallId(),
            peerId: payload.from,
            peerName: payload.fromName || 'Someone',
            avatarUrl: payload.fromAvatar || null,
            avatarColor: payload.fromColor || null,
            withVideo: Boolean(payload.withVideo),
            direction: 'incoming',
            status: 'missed',
            startedAt: Date.now(),
            duration: 0,
          })
          return
        }
        const offer = {
          callId: payload.callId,
          conversationId: payload.conversationId,
          peerId: payload.from,
          peerName: payload.fromName || 'Someone',
          peerAvatar: payload.fromAvatar || null,
          peerColor: payload.fromColor || null,
          withVideo: Boolean(payload.withVideo),
          facingMode: payload.facingMode === 'user' ? 'user' : 'environment',
          sdp: payload.sdp,
        }
        showIncoming(offer)
        return
      }

      if (type === 'answer') {
        if (!current || current.callId !== payload.callId) return
        const pc = pcRef.current
        if (!pc) return
        try {
          await pc.setRemoteDescription(payload.sdp)
        } catch {
          showNotice('Call could not be connected')
          cleanup(false)
          return
        }
        stopRingtone()
        await applyPendingIce(pc)
        setRemoteFacingMode(payload.facingMode === 'user' ? 'user' : 'environment')
        patchCall({ phase: 'connecting' })
        return
      }

      if (type === 'camera') {
        if (!current || current.callId !== payload.callId) return
        setRemoteFacingMode(payload.facingMode === 'user' ? 'user' : 'environment')
        return
      }

      if (type === 'filter') {
        if (!current || current.callId !== payload.callId) return
        setRemoteFilter(typeof payload.filter === 'string' ? payload.filter : 'none')
        return
      }

      if (type === 'screen') {
        if (!current || current.callId !== payload.callId) return
        const sharing = Boolean(payload.sharing)
        remoteSharingRef.current = sharing
        setRemoteSharing(sharing)
        patchCall({ remoteSharing: sharing })
        return
      }

      if (type === 'renegotiate') {
        const pc = pcRef.current
        if (!pc || !current || current.callId !== payload.callId) return
        try {
          await pc.setRemoteDescription(payload.sdp)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await sendSignal(payload.from, {
            type: 'renegotiate-answer',
            callId: payload.callId,
            sdp: descriptionOf(pc.localDescription),
          })
        } catch {}
        return
      }

      if (type === 'renegotiate-answer') {
        const pc = pcRef.current
        if (!pc || !current || current.callId !== payload.callId) return
        try {
          await pc.setRemoteDescription(payload.sdp)
        } catch {}
        return
      }

      if (type === 'ice') {
        if (!payload.candidate) return
        if (incomingRef.current?.callId === payload.callId && !pcRef.current) {
          pendingIceRef.current.push(payload.candidate)
          return
        }
        const pc = pcRef.current
        if (!pc || (current && current.callId !== payload.callId)) return
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate)
          return
        }
        try {
          await pc.addIceCandidate(payload.candidate)
        } catch {}
        return
      }

      if (type === 'missed') {
        if (incomingRef.current?.callId !== payload.callId && current?.callId !== payload.callId) return
        const offer = incomingRef.current
        if (offer && !current) {
          stopRingtone()
          showMissedNotification({
            callId: payload.callId,
            peerId: offer.peerId,
            peerName: offer.peerName,
            conversationId: offer.conversationId,
          })
          incomingRef.current = null
          setIncoming(null)
        }
        clearInvite(payload.callId)
        inviteCallIdRef.current = null
        if (!current) cleanup(false)
        return
      }

      if (type === 'end' || type === 'decline' || type === 'busy') {
        if (type === 'end' && current?.callId !== payload.callId && incomingRef.current?.callId !== payload.callId) return
        const offer = !current && incomingRef.current?.callId === payload.callId ? incomingRef.current : null
        if (offer && type === 'end') {
          stopRingtone()
          showMissedNotification({
            callId: payload.callId,
            peerId: offer.peerId,
            peerName: offer.peerName,
            conversationId: offer.conversationId,
          })
        }
        cleanup(false)
        if (type === 'decline') showNotice('Call declined')
        if (type === 'busy') showNotice('User is busy')
      }
    },
    [user, sendSignal, applyPendingIce, cleanup, showNotice, patchCall, showIncoming, showMissedNotification, clearInvite]
  )

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    setHistory(readHistory(user?.id))
  }, [user?.id])

  const pushEntry = useCallback(
    (entry) => {
      if (!user) return
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 100)
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const patchEntry = useCallback(
    (id, patch) => {
      if (!user || !id) return
      setHistory((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const removeHistoryEntry = useCallback(
    (id) => {
      if (!user) return
      setHistory((prev) => {
        const next = prev.filter((entry) => entry.id !== id)
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const clearHistory = useCallback(() => {
    if (!user) return
    writeHistory(user.id, [])
    setHistory([])
  }, [user])

  useEffect(() => {
    patchEntryRef.current = patchEntry
  }, [patchEntry])

  useEffect(() => {
    pushEntryRef.current = pushEntry
  }, [pushEntry])

  useEffect(() => {
    signalHandlerRef.current = handleSignal
  }, [handleSignal])

  useEffect(() => {
    if (!user || !supabase) return undefined
    const channel = supabase
      .channel(`calls:${user.id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'signal' }, ({ payload }) => signalHandlerRef.current?.(payload))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    if (!user || !supabase) return
    const params = new URLSearchParams(window.location.search)
    const callId = params.get('call')
    const callbackPeer = params.get('peer')
    const callbackConv = params.get('conv')
    const callbackName = params.get('name')
    const caller = params.get('caller')
    const action = params.get('action')
    if (!callId && !callbackPeer) return
    ;['call', 'caller', 'action', 'missed', 'peer', 'conv', 'name'].forEach((key) =>
      params.delete(key)
    )
    const query = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )

    if (action === 'callback' && callbackPeer) {
      window.setTimeout(() => {
        startCallRef.current?.({
          conversationId: callbackConv || undefined,
          peerId: callbackPeer,
          peerName: callbackName || 'Someone',
          withVideo: false,
        })
      }, 50)
      return
    }
    if (!callId) return

    const restore = async () => {
      const { data } = await supabase
        .from('call_invites')
        .select('*')
        .eq('call_id', callId)
        .eq('callee_id', user.id)
        .maybeSingle()
      if (!data || data.status !== 'pending') return
      inviteCallIdRef.current = callId
      const details = data.payload || {}
      if (action === 'decline') {
        if (caller) await sendSignal(caller, { type: 'decline', callId })
        showMissedNotification({
          callId,
          peerId: data.caller_id,
          peerName: details.fromName,
          conversationId: details.conversationId,
        })
        await supabase.from('call_invites').update({ status: 'declined' }).eq('call_id', callId)
        inviteCallIdRef.current = null
        return
      }
      const offer = {
        callId,
        conversationId: details.conversationId,
        peerId: data.caller_id,
        peerName: details.fromName || 'Someone',
        peerAvatar: details.fromAvatar || null,
        peerColor: details.fromColor || null,
        withVideo: Boolean(details.withVideo),
        facingMode: details.facingMode,
        sdp: details.sdp,
      }
      showIncoming(offer)
      if (action === 'answer') {
        window.setTimeout(() => {
          acceptCallRef.current?.()
        }, 50)
      }
    }
    restore()
  }, [user, sendSignal, showIncoming, showMissedNotification])

  useEffect(() => {
    cleanupRef.current = cleanup
  }, [cleanup])

  useEffect(
    () => () => {
      cleanupRef.current?.(false)
      peerChannelsRef.current.forEach((channel) => supabase?.removeChannel(channel))
      peerChannelsRef.current.clear()
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (!call) {
      clearOngoingNotification()
      return
    }
    showOngoingNotification(call)
  }, [call, showOngoingNotification, clearOngoingNotification])

  useEffect(() => {
    const active = Boolean(call?.callId)
    moduleActiveCall = active
    if (active) pushOverlayEntry()
  }, [call?.callId, pushOverlayEntry])

  useEffect(() => {
    const onPopState = () => {
      if (unwindingRef.current) return
      if (!callRef.current) return
      if (!window.history.state?.cwCallOverlay && overlayDepthRef.current > 0) {
        overlayDepthRef.current -= 1
      }
      overlayEntryRef.current = false
      if (minimizedRef.current) return
      minimizedRef.current = true
      setMinimized(true)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const minimizeCall = useCallback(() => {
    if (!callRef.current || minimizedRef.current) return
    pushOverlayEntry()
    minimizedRef.current = true
    setMinimized(true)
  }, [pushOverlayEntry])

  const restoreCall = useCallback(() => {
    if (!callRef.current) {
      closeStaleOngoingNotifications()
      return
    }
    minimizedRef.current = false
    setMinimized(false)
    pushOverlayEntry()
  }, [pushOverlayEntry])

  const getStream = useCallback(async (withVideo, mode = 'user') => {
    const constrained = withVideo ? videoConstraints(mode) : false
    if (withVideo) {
      for (const video of [constrained, true]) {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video })
        } catch {}
      }
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      } catch {}
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {}
    return null
  }, [])

  const startCall = useCallback(
    async ({
      conversationId,
      peerId,
      peerName,
      peerAvatar = null,
      peerColor = null,
      selfAvatar = null,
      selfColor = null,
      withVideo = false,
    }) => {
      if (!user || callRef.current || incomingRef.current) return
      const stream = await getStream(withVideo, facingModeRef.current)
      if (!stream) {
        showNotice('Microphone or camera access denied')
        return
      }

      const callId = makeCallId()
      inviteCallIdRef.current = callId
      const info = {
        callId,
        conversationId,
        peerId,
        peerName,
        avatarUrl: peerAvatar,
        avatarColor: peerColor,
        withVideo: stream.getVideoTracks().length > 0,
        role: 'caller',
        phase: 'calling',
        startedAt: null,
        muted: false,
      }
      localRef.current = stream
      setLocalStream(stream)
      callRef.current = info
      setCall(info)
      startRingtone()

      const pc = await preparePeer()
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdp = descriptionOf(pc.localDescription)
      supabase?.from('call_invites').insert({
        call_id: callId,
        caller_id: user.id,
        callee_id: peerId,
        payload: {
          conversationId,
          fromName: displayNameOf(user),
          fromAvatar: selfAvatar,
          fromColor: selfColor,
          withVideo: info.withVideo,
          facingMode: facingModeRef.current,
          sdp,
        },
      }).then(() => {}).catch(() => {})
      const sent = await sendSignal(peerId, {
        type: 'offer',
        callId,
        conversationId,
        sdp,
        fromName: displayNameOf(user),
        fromAvatar: selfAvatar,
        fromColor: selfColor,
        withVideo: info.withVideo,
        facingMode: facingModeRef.current,
      })
      if (!sent) {
        showNotice('Could not reach the other user')
        cleanup(false)
        return
      }

      const historyId = makeCallId()
      historyIdRef.current = historyId
      pushEntry({
        id: historyId,
        peerId,
        peerName,
        avatarUrl: peerAvatar,
        avatarColor: peerColor,
        withVideo: info.withVideo,
        direction: 'outgoing',
        status: 'calling',
        startedAt: Date.now(),
        duration: 0,
      })

      timerRef.current = window.setTimeout(() => {
        if (callRef.current?.phase === 'calling') {
          sendSignal(peerId, { type: 'missed', callId })
          showMissedNotification({
            callId,
            peerId,
            peerName,
            conversationId,
            outgoing: true,
          })
          showNotice('No answer')
          cleanup(false)
        }
      }, 45000)
    },
    [user, getStream, preparePeer, sendSignal, showNotice, cleanup, pushEntry, showMissedNotification]
  )

  useEffect(() => {
    startCallRef.current = startCall
  }, [startCall])

  const acceptCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    const stream = await getStream(offer.withVideo, facingModeRef.current)
    if (!stream) {
      showNotice('Microphone or camera access denied')
      return
    }

    incomingRef.current = null
    setIncoming(null)
    const info = {
      callId: offer.callId,
      conversationId: offer.conversationId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: stream.getVideoTracks().length > 0,
      role: 'callee',
      phase: 'connecting',
      startedAt: null,
      muted: false,
    }
    localRef.current = stream
    setLocalStream(stream)
    callRef.current = info
    setCall(info)
    clearInvite(info.callId)
    inviteCallIdRef.current = null

    const historyId = makeCallId()
    historyIdRef.current = historyId
    pushEntry({
      id: historyId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: info.withVideo,
      direction: 'incoming',
      status: 'calling',
      startedAt: Date.now(),
      duration: 0,
    })

    const pc = await preparePeer()
    try {
      await pc.setRemoteDescription(offer.sdp)
    } catch {
      showNotice('Call could not be connected')
      cleanup(false)
      return
    }
    await applyPendingIce(pc)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await sendSignal(info.peerId, {
      type: 'answer',
      callId: info.callId,
      sdp: descriptionOf(pc.localDescription),
      facingMode: facingModeRef.current,
    })
  }, [getStream, preparePeer, applyPendingIce, sendSignal, showNotice, cleanup, pushEntry, clearInvite])

  useEffect(() => {
    acceptCallRef.current = acceptCall
  }, [acceptCall])

  const declineCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    await sendSignal(offer.peerId, { type: 'decline', callId: offer.callId })
    showMissedNotification({
      callId: offer.callId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      conversationId: offer.conversationId,
    })
    clearInvite(offer.callId)
    inviteCallIdRef.current = null
    pushEntry({
      id: makeCallId(),
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: offer.withVideo,
      direction: 'incoming',
      status: 'declined',
      startedAt: Date.now(),
      duration: 0,
    })
    incomingRef.current = null
    setIncoming(null)
  }, [sendSignal, pushEntry, clearInvite, showMissedNotification])

  const switchCamera = useCallback(async () => {
    const stream = localRef.current
    const pc = pcRef.current
    if (switchingRef.current || !stream || !pc || pc.signalingState === 'closed') return
    const oldTrack = stream.getVideoTracks()[0]
    if (!oldTrack) return
    switchingRef.current = true

    const nextFacing = facingModeRef.current === 'user' ? 'environment' : 'user'
    const currentId = oldTrack.getSettings?.().deviceId
    let devices = []
    try {
      devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === 'videoinput'
      )
    } catch {}
    const alternate = devices.find((device) => device.deviceId && device.deviceId !== currentId)

    if (devices.length === 1 && !alternate) {
      switchingRef.current = false
      showNotice('Only one camera available')
      return
    }

    const request = async (video) => navigator.mediaDevices.getUserMedia({ audio: false, video })
    const attempts = []
    if (alternate?.deviceId) {
      attempts.push({
        video: { ...VIDEO_LIMITS, deviceId: { exact: alternate.deviceId } },
        exact: true,
        switched: true,
      })
    }
    attempts.push({
      video: { ...VIDEO_LIMITS, facingMode: { exact: nextFacing } },
      exact: true,
      switched: true,
    })
    attempts.push({
      video: { ...VIDEO_LIMITS, facingMode: { ideal: nextFacing } },
      facing: nextFacing,
      switched: true,
    })
    attempts.push({ video: true, exact: true, switched: false })

    stream.removeTrack(oldTrack)
    oldTrack.stop()
    await new Promise((resolve) => window.setTimeout(resolve, 120))

    let nextStream = null
    let switched = false
    for (const attempt of attempts) {
      try {
        const candidate = await request(attempt.video)
        const track = candidate.getVideoTracks()[0]
        if (!track) {
          candidate.getTracks().forEach((item) => item.stop())
          continue
        }
        const settings = track.getSettings?.()
        const matches = attempt.exact || (settings?.facingMode && settings.facingMode === attempt.facing)
        if (matches) {
          nextStream = candidate
          switched = attempt.switched
          break
        }
        candidate.getTracks().forEach((item) => item.stop())
      } catch {}
    }

    if (!nextStream) {
      for (const video of [videoConstraints(facingModeRef.current), true]) {
        try {
          const candidate = await request(video)
          if (candidate.getVideoTracks().length) {
            nextStream = candidate
            break
          }
        } catch {}
      }
    }

    const nextTrack = nextStream?.getVideoTracks()[0]
    if (!nextTrack) {
      switchingRef.current = false
      showNotice('Could not switch camera')
      return
    }

    const sender = pc.getSenders().find((item) => item.track?.kind === 'video')
    if (!sender) {
      nextTrack.stop()
      switchingRef.current = false
      return
    }
    try {
      await sender.replaceTrack(nextTrack)
    } catch {
      nextTrack.stop()
      switchingRef.current = false
      showNotice('Could not switch camera')
      return
    }

    stream.addTrack(nextTrack)
    const effectiveFacing = switched ? nextFacing : facingModeRef.current
    facingModeRef.current = effectiveFacing
    setFacingMode(effectiveFacing)
    const updated = new MediaStream(stream.getTracks())
    localRef.current = updated
    setLocalStream(updated)
    switchingRef.current = false

    const current = callRef.current
    if (current) {
      sendSignal(current.peerId, {
        type: 'camera',
        callId: current.callId,
        facingMode: effectiveFacing,
      })
    }
  }, [sendSignal, showNotice])

  const stopScreenShare = useCallback(async () => {
    const current = callRef.current
    const audioTracks = localRef.current?.getAudioTracks() || []
    const screenTrack = screenTrackRef.current
    if (screenTrack) {
      screenTrack.onended = null
      try { screenTrack.stop() } catch {}
      screenTrackRef.current = null
    }
    screenSharingRef.current = false
    setScreenSharing(false)
    if (current) {
      try {
        await sendSignal(current.peerId, { type: 'screen', callId: current.callId, sharing: false })
      } catch {}
    }

    const camera = cameraTrackRef.current
    if (camera && camera.readyState === 'live') {
      const ok = await replaceVideoTrack(camera)
      const next = new MediaStream([...audioTracks, camera])
      localRef.current = next
      if (ok) setLocalStream(next)
    } else {
      await replaceVideoTrack(null)
      localRef.current = new MediaStream(audioTracks)
      setLocalStream(localRef.current)
    }
  }, [replaceVideoTrack, sendSignal])

  useEffect(() => {
    stopScreenRef.current = stopScreenShare
  }, [stopScreenShare])

  const startScreenShare = useCallback(async () => {
    if (screenSharingRef.current) {
      await stopScreenShare()
      return true
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showNotice('Screen sharing is not supported here')
      return false
    }
    const current = callRef.current
    if (!current) return false
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      })
      const track = display.getVideoTracks()[0]
      if (!track) {
        display.getTracks().forEach((item) => item.stop())
        return false
      }
      if (!cameraTrackRef.current) {
        cameraTrackRef.current = localRef.current?.getVideoTracks()[0] || null
      }
      track.onended = () => stopScreenRef.current?.()
      const ok = await replaceVideoTrack(track)
      if (!ok) {
        try { track.stop() } catch {}
        showNotice('Could not share your screen')
        return false
      }
      screenTrackRef.current = track
      screenSharingRef.current = true
      const next = new MediaStream([...(localRef.current?.getAudioTracks() || []), track])
      localRef.current = next
      setLocalStream(next)
      setScreenSharing(true)
      try {
        await sendSignal(current.peerId, { type: 'screen', callId: current.callId, sharing: true })
      } catch {}
      return true
    } catch (error) {
      if (error?.name !== 'NotAllowedError') showNotice('Screen sharing was cancelled')
      return false
    }
  }, [replaceVideoTrack, sendSignal, showNotice, stopScreenShare])

  const applyVideoFilter = useCallback(
    (filter) => {
      setVideoFilter(filter)
      const current = callRef.current
      if (current) {
        sendSignal(current.peerId, { type: 'filter', callId: current.callId, filter })
      }
    },
    [sendSignal]
  )

  const endCall = useCallback(() => cleanup(true), [cleanup])

  const toggleMute = useCallback(() => {
    const stream = localRef.current
    if (!stream) return
    const nextMuted = !callRef.current?.muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    patchCall({ muted: nextMuted })
  }, [patchCall])

  return {
    incoming,
    call,
    localStream,
    remoteStream,
    facingMode,
    remoteFacingMode,
    videoFilter,
    remoteFilter,
    screenSharing,
    remoteSharing,
    minimized,
    minimizeCall,
    restoreCall,
    startScreenShare,
    stopScreenShare,
    applyVideoFilter,
    notice,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    switchCamera,
    history,
    removeHistoryEntry,
    clearHistory,
  }
}
