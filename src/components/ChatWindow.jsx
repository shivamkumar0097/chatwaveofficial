import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Clock,
  Download,
  Forward,
  ImagePlus,
  MessageSquareDashed,
  MoreVertical,
  Palette,
  Phone,
  Pin,
  PinOff,
  Search,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Users,
  Video,
  Waves,
  X,
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import Composer from '@/components/Composer'
import DisappearingModal from '@/components/DisappearingModal'
import GroupMembersModal from '@/components/GroupMembersModal'
import MessageBubble from '@/components/MessageBubble'
import PopoverMenu from '@/components/PopoverMenu'
import { useTyping } from '@/hooks/useTyping'

const formatLastSeen = (iso) => {
  if (!iso) return 'last seen recently'
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'last seen just now'
  if (date.toDateString() === new Date().toDateString()) {
    return `last seen at ${date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`
  }
  return `last seen ${date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })}`
}

const dayLabel = (date) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

const muteFromStorage = (raw) => {
  if (!raw || raw === '0') return null
  if (raw === '1' || raw === 'forever') return 'forever'
  const until = Number(raw)
  return Number.isFinite(until) && until > Date.now() ? until : null
}

const readWallpaperFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not open that image.'))
      image.onload = () => {
        const max = 1400
        const scale = Math.min(1, max / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })

const readPinnedMessages = (chatId) => {
  if (!chatId) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(`cw-pinned-msgs:${chatId}`) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const MUTE_OPTIONS = [
  { label: '8 hours', value: 8 * 60 * 60 * 1000 },
  { label: '1 week', value: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Always', value: 'forever' },
]

const WALLPAPERS = [
  { id: 'custom', label: 'My Photo', style: null, custom: true },
  { id: 'default', label: 'Dots', style: null },
  {
    id: 'midnight',
    label: 'Midnight',
    style: {
      backgroundColor: '#0b0d18',
      backgroundImage: 'linear-gradient(160deg, #0b0d18, #12172a 55%, #0a0c14)',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    style: {
      backgroundColor: '#080911',
      backgroundImage:
        'radial-gradient(600px 380px at 15% 0%, rgba(124,92,255,0.22), transparent 65%), radial-gradient(600px 420px at 90% 100%, rgba(34,211,238,0.18), transparent 60%)',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    style: {
      backgroundColor: '#120a12',
      backgroundImage:
        'radial-gradient(700px 420px at 100% 0%, rgba(244,114,182,0.18), transparent 65%), radial-gradient(600px 420px at 0% 100%, rgba(124,92,255,0.14), transparent 60%)',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    style: {
      backgroundColor: '#06121e',
      backgroundImage:
        'radial-gradient(800px 500px at 10% 0%, rgba(14,165,233,0.18), transparent 60%), radial-gradient(700px 500px at 90% 100%, rgba(16,185,129,0.12), transparent 60%)',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    style: {
      backgroundColor: '#07150f',
      backgroundImage:
        'radial-gradient(700px 500px at 0% 0%, rgba(52,211,153,0.16), transparent 65%), radial-gradient(650px 500px at 100% 100%, rgba(132,204,22,0.12), transparent 60%)',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    style: {
      backgroundColor: '#1a0d0d',
      backgroundImage:
        'radial-gradient(750px 480px at 80% 0%, rgba(251,146,60,0.2), transparent 65%), radial-gradient(700px 500px at 10% 100%, rgba(236,72,153,0.16), transparent 60%)',
    },
  },
  {
    id: 'nebula',
    label: 'Nebula',
    style: {
      backgroundColor: '#080715',
      backgroundImage:
        'radial-gradient(500px 400px at 30% 20%, rgba(168,85,247,0.22), transparent 70%), radial-gradient(450px 350px at 75% 75%, rgba(56,189,248,0.18), transparent 70%), radial-gradient(2px 2px at 60% 30%, rgba(255,255,255,0.45), transparent 100%)',
    },
  },
  {
    id: 'grid',
    label: 'Grid',
    style: {
      backgroundColor: '#0b0e16',
      backgroundImage:
        'linear-gradient(rgba(124,92,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.08) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    },
  },
  {
    id: 'golden',
    label: 'Golden',
    style: {
      backgroundColor: '#151007',
      backgroundImage:
        'radial-gradient(700px 450px at 15% 10%, rgba(251,191,36,0.16), transparent 65%), radial-gradient(650px 450px at 85% 90%, rgba(245,158,11,0.12), transparent 60%)',
    },
  },
]

export default function ChatWindow({
  chat,
  user,
  onSend,
  onSendAttachment,
  uploading,
  onBack,
  onReact,
  onForward,
  onEditMessage,
  onDeleteMessage,
  onStarMessage,
  starredIds,
  pinned = false,
  archived = false,
  onTogglePin,
  onToggleArchive,
  unreadAnchorId,
  contacts = [],
  onAddMember,
  onRemoveMember,
  onRenameGroup,
  onTransferAdmin,
  onDeleteGroup,
  onCall,
  disappearingTimer = 'off',
  onSetTimer,
  className = '',
}) {
  const scrollRef = useRef(null)
  const menuRef = useRef(null)
  const atBottomRef = useRef(true)
  const prevChatRef = useRef(undefined)
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [disappearingOpen, setDisappearingOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [starredOpen, setStarredOpen] = useState(false)
  const [pinnedMessageIds, setPinnedMessageIds] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [muteOpen, setMuteOpen] = useState(false)
  const [wallpaperOpen, setWallpaperOpen] = useState(false)
  const [mutedUntil, setMutedUntil] = useState(null)
  const [wallpaper, setWallpaper] = useState('default')
  const [customWallpaper, setCustomWallpaper] = useState(null)
  const [customBusy, setCustomBusy] = useState(false)
  const customInputRef = useRef(null)
  const [toast, setToast] = useState('')
  const messageCount = chat?.messages.length ?? 0
  const lastMessageId = chat?.messages[chat.messages.length - 1]?.id
  const { typingNames, notifyTyping } = useTyping(chat?.id, user)
  const typing = typingNames.length > 0
  const muted = Boolean(mutedUntil)

  useEffect(() => {
    setReplyTo(null)
    setEditing(null)
    setMenuOpen(false)
    setInfoOpen(false)
    setMembersOpen(false)
    setDisappearingOpen(false)
    setSearchOpen(false)
    setSearchQuery('')
    setStarredOpen(false)
    setMuteOpen(false)
    setWallpaperOpen(false)
    setMutedUntil(
      chat?.id ? muteFromStorage(window.localStorage.getItem(`cw-muted:${chat.id}`)) : null
    )
    setWallpaper(
      chat?.id ? window.localStorage.getItem(`cw-wallpaper:${chat.id}`) || 'default' : 'default'
    )
    setCustomWallpaper(
      chat?.id ? window.localStorage.getItem(`cw-wallpaper-custom:${chat.id}`) : null
    )
    setPinnedMessageIds(readPinnedMessages(chat?.id))
    setSelectMode(false)
    setSelectedIds([])
  }, [chat?.id])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const chatChanged = prevChatRef.current !== chat?.id
    if (chatChanged) {
      prevChatRef.current = chat?.id
      atBottomRef.current = true
      node.scrollTop = node.scrollHeight
      return
    }
    if (!chat) return
    const last = chat.messages[chat.messages.length - 1]
    if (atBottomRef.current || last?.from === 'me') {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
      atBottomRef.current = true
    }
  }, [chat?.id, messageCount, lastMessageId, chat])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const togglePinnedMessage = (message) => {
    if (!chat?.id || message.deleted) return
    setPinnedMessageIds((prev) => {
      const next = prev.includes(message.id)
        ? prev.filter((id) => id !== message.id)
        : [message.id, ...prev].slice(0, 5)
      try {
        window.localStorage.setItem(`cw-pinned-msgs:${chat.id}`, JSON.stringify(next))
      } catch {}
      return next
    })
    showToast(pinnedMessageIds.includes(message.id) ? 'Message unpinned' : 'Message pinned')
  }

  const scrollToMessage = (id) => {
    const node = document.getElementById(`message-${id}`)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleSelectToggle = (message) => {
    if (message.deleted) return
    if (!selectMode) {
      setSelectMode(true)
      setSelectedIds([message.id])
      return
    }
    setSelectedIds((prev) =>
      prev.includes(message.id) ? prev.filter((id) => id !== message.id) : [...prev, message.id]
    )
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds([])
  }

  const selectedMessages = (chat?.messages || []).filter((message) => selectedIds.includes(message.id))

  const deleteSelectedMessages = async () => {
    const targets = selectedMessages
    exitSelectMode()
    await Promise.all(targets.map((message) => onDeleteMessage?.(message, false)))
  }

  const forwardSelectedMessages = () => {
    if (!selectedMessages.length) return
    const targets = selectedMessages
    exitSelectMode()
    onForward?.({ ...targets[0], bulk: targets })
  }

  const handleCustomWallpaper = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !chat?.id) return
    setCustomBusy(true)
    try {
      const dataUrl = await readWallpaperFile(file)
      window.localStorage.setItem(`cw-wallpaper-custom:${chat.id}`, dataUrl)
      window.localStorage.setItem(`cw-wallpaper:${chat.id}`, 'custom')
      setCustomWallpaper(dataUrl)
      setWallpaper('custom')
      setWallpaperOpen(false)
      showToast('Your photo is now the wallpaper')
    } catch (error) {
      showToast(error?.message || 'Could not set that photo')
    } finally {
      setCustomBusy(false)
    }
  }

  const applyMute = (value) => {
    if (!chat?.id) return
    const key = `cw-muted:${chat.id}`
    if (value === null) {
      window.localStorage.setItem(key, '0')
      setMutedUntil(null)
      showToast('Notifications unmuted')
    } else if (value === 'forever') {
      window.localStorage.setItem(key, 'forever')
      setMutedUntil('forever')
      showToast('Notifications muted')
    } else {
      window.localStorage.setItem(key, String(Date.now() + value))
      setMutedUntil(Date.now() + value)
      showToast(`Notifications muted for ${value === MUTE_OPTIONS[0].value ? '8 hours' : '1 week'}`)
    }
    setMuteOpen(false)
    setMenuOpen(false)
  }

  const exportChat = () => {
    const lines = (chat.messages || []).map((message) => {
      const who = authorNameOf(message)
      const body = message.deleted
        ? '[Message deleted]'
        : message.imageUrl && !message.text
          ? '[Photo]'
          : message.fileUrl && !message.text
            ? `[File: ${message.fileName || 'attachment'}]`
            : message.text
      return `[${message.time || ''}] ${who}: ${body}`
    })
    const blob = new Blob([`Chat with ${chat.name}\n\n${lines.join('\n')}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chatwave-${chat.name.replace(/[^\w]/g, '_')}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
    showToast('Chat exported')
  }

  const replyMap = useMemo(() => {
    const map = {}
    for (const message of chat?.messages || []) map[message.id] = message
    return map
  }, [chat?.messages])

  const authorNameOf = (message) => {
    if (!message) return ''
    if (message.from === 'me') return 'You'
    if (chat?.isGroup) {
      return chat.members?.find((member) => member.id === message.senderId)?.name || 'Member'
    }
    return chat?.name || 'Them'
  }

  const openSearch = () => {
    setMenuOpen(false)
    setSearchOpen(true)
  }

  const jumpToMessage = (id) => {
    setSearchOpen(false)
    setSearchQuery('')
    window.requestAnimationFrame(() => {
      const node = document.getElementById(`message-${id}`)
      if (!node) return
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      node.classList.add('search-flash')
      window.setTimeout(() => node.classList.remove('search-flash'), 1600)
    })
  }

  if (!chat) {
    return (
      <section
        className={`relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-wa-bg px-6 text-center md:flex ${className}`}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="aurora-blob left-[12%] top-[18%] h-64 w-64 bg-[#7c5cff]/25" />
          <div
            className="aurora-blob bottom-[12%] right-[10%] h-64 w-64 bg-[#22d3ee]/20"
            style={{ animationDelay: '-7s' }}
          />
        </div>

        <div className="animate-fade-up relative flex flex-col items-center gap-6">
          <div className="relative grid place-items-center">
            <span className="absolute h-40 w-40 rounded-full border border-white/[0.06]" />
            <span className="absolute h-28 w-28 rounded-full border border-white/[0.08]" />
            <div className="animate-float grid h-20 w-20 place-items-center rounded-3xl shadow-[0_25px_60px_-20px_rgba(124,92,255,0.85)]"><img src="/logo.jpg" alt="ChatWave" className="h-12 w-12" /></div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your messages, <span className="gradient-text">beautifully in sync</span>
            </h2>
            <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-wa-muted">
              Select a conversation from the left or start a new one. Everything updates live, on
              every device.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: Sparkles, label: 'Live presence' },
              { icon: MessageSquareDashed, label: 'Read receipts' },
              { icon: Waves, label: 'Instant sync' },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[11px] text-wa-muted"
              >
                <item.icon size={13} className="text-wa-green" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const status = typing
    ? `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing...`
    : chat.isGroup
      ? `${chat.members?.length || chat.memberIds?.length || 0} members`
      : chat.online
        ? 'online'
        : formatLastSeen(chat.lastSeen)

  const wallpaperPreset =
    wallpaper === 'custom' && customWallpaper
      ? {
          id: 'custom',
          label: 'My Photo',
          style: {
            backgroundColor: '#080911',
            backgroundImage: `linear-gradient(rgba(6,8,14,0.55), rgba(6,8,14,0.55)), url("${customWallpaper}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          },
        }
      : WALLPAPERS.find((item) => item.id === wallpaper) || WALLPAPERS[0]
  const query = searchQuery.trim().toLowerCase()
  const results = query
    ? chat.messages
        .filter((message) => !message.deleted && message.text?.toLowerCase().includes(query))
        .slice(-30)
        .reverse()
    : []
  const starredMessages = chat.messages.filter(
    (message) => starredIds?.has(message.id) && !message.deleted
  )
  const starredCount = starredMessages.length
  const pinnedMessages = pinnedMessageIds
    .map((id) => chat.messages.find((message) => message.id === id))
    .filter((message) => message && !message.deleted)

  const timeline = []
  let lastDay = ''
  for (const message of chat.messages) {
    const date = new Date(message.createdAt)
    const dayKey = date.toDateString()
    if (dayKey !== lastDay) {
      timeline.push({ type: 'day', key: `day-${dayKey}`, label: dayLabel(date) })
      lastDay = dayKey
    }
    if (unreadAnchorId === message.id) timeline.push({ type: 'unread', key: `unread-${message.id}` })
    timeline.push({ type: 'message', key: message.id, message })
  }

  const menuButton =
    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13px] text-wa-text transition-colors hover:bg-white/[0.06]'

  return (
    <section className={`relative h-full min-w-0 flex-1 flex-col ${className}`}>
      <header className="cw-chat-header animate-slide-down sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b border-white/[0.05] bg-[#0a0c14]/75 px-2 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="icon-btn md:hidden"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => (chat.isGroup ? setMembersOpen(true) : setInfoOpen(true))}
          className="-ml-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/[0.05]"
          aria-label={chat.isGroup ? 'View group members' : 'View contact'}
          title={chat.isGroup ? 'Group members' : 'View contact'}
        >
          <Avatar
            name={chat.name}
            color={chat.avatarColor}
            src={chat.avatarUrl}
            size="sm"
            online={!chat.isGroup && chat.online}
          />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 truncate text-[16px] font-semibold tracking-tight">
              <span className="truncate">{chat.name}</span>
              {disappearingTimer !== 'off' && (
                <Clock size={12} className="shrink-0 text-wa-green" title="Disappearing messages on" />
              )}
              {pinned && <Pin size={12} className="shrink-0 rotate-45 text-wa-muted" />}
              {muted && <BellOff size={13} className="shrink-0 text-wa-muted" />}
            </h1>
            <p
              className={`truncate text-[12.5px] ${
                typing ? 'text-accent-2' : chat.online ? 'text-accent-2/90' : 'text-wa-muted'
              }`}
            >
              {typing && (
                <span className="mr-1 inline-flex items-end gap-0.5 align-middle">
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                </span>
              )}
              {status}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {!chat.isGroup && (
            <>
              <button
                type="button"
                onClick={() => onCall?.({ withVideo: true })}
                className="icon-btn"
                aria-label="Video call"
              >
                <Video size={19} />
              </button>
              <button
                type="button"
                onClick={() => onCall?.({ withVideo: false })}
                className="icon-btn hidden sm:grid"
                aria-label="Voice call"
              >
                <Phone size={18} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
            className={`icon-btn hidden sm:grid ${searchOpen ? 'bg-white/[0.08] text-white' : ''}`}
            aria-label="Search in chat"
          >
            <Search size={18} />
          </button>
          <div className="relative">
            <button
              ref={menuRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`icon-btn ${menuOpen ? 'bg-white/[0.08] text-white' : ''}`}
              aria-label="Chat menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical size={19} />
            </button>
            <PopoverMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuRef}
              width={248}
            >
              {chat.isGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setMembersOpen(true)
                    setMenuOpen(false)
                  }}
                  className={menuButton}
                >
                  <Users size={17} className="text-wa-green" />
                  <span className="flex-1">Group members</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(true)
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                <UserRound size={17} className="text-wa-green" />
                <span className="flex-1">{chat.isGroup ? 'Group info' : 'View contact'}</span>
              </button>
              <button type="button" onClick={openSearch} className={menuButton}>
                <Search size={17} className="text-wa-green" />
                <span className="flex-1">Search messages</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisappearingOpen(true)
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                <Clock size={17} className="text-wa-green" />
                <span className="flex-1">Disappearing messages</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStarredOpen(true)
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                <Star size={17} className="text-wa-green" />
                <span className="flex-1">Starred messages</span>
                {starredCount > 0 && (
                  <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] text-wa-muted">
                    {starredCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMuteOpen(true)
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                {muted ? (
                  <BellOff size={17} className="text-wa-green" />
                ) : (
                  <Bell size={17} className="text-wa-green" />
                )}
                <span className="flex-1">
                  {muted ? 'Muted notifications' : 'Mute notifications'}
                </span>
                {muted && <Check size={15} className="text-wa-green" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWallpaperOpen(true)
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                <Palette size={17} className="text-wa-green" />
                <span className="flex-1">Wallpaper</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onTogglePin?.()
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                {pinned ? (
                  <PinOff size={17} className="text-wa-green" />
                ) : (
                  <Pin size={17} className="text-wa-green" />
                )}
                <span className="flex-1">{pinned ? 'Unpin chat' : 'Pin chat'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleArchive?.()
                  setMenuOpen(false)
                }}
                className={menuButton}
              >
                {archived ? (
                  <ArchiveRestore size={17} className="text-wa-green" />
                ) : (
                  <Archive size={17} className="text-wa-green" />
                )}
                <span className="flex-1">{archived ? 'Unarchive chat' : 'Archive chat'}</span>
              </button>
              <div className="my-1 h-px bg-white/[0.06]" />
              <button type="button" onClick={exportChat} className={menuButton}>
                <Download size={17} className="text-wa-green" />
                <span className="flex-1">Export chat</span>
              </button>
            </PopoverMenu>
          </div>
        </div>
        <div className="gradient-line absolute inset-x-0 bottom-0" />
      </header>

      {searchOpen && (
        <div className="relative z-10 border-b border-white/[0.05] bg-[#0a0c14]/90 px-3 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-xl border border-wa-green/30 bg-white/[0.04] px-3 py-1.5">
            <Search size={15} className="shrink-0 text-wa-green" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search in this chat"
              className="min-w-0 flex-1 bg-transparent py-0.5 text-[13px] text-wa-text outline-none placeholder:text-wa-muted"
            />
            {query && (
              <span className="shrink-0 text-[11px] text-wa-muted">{results.length} found</span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false)
                setSearchQuery('')
              }}
              className="shrink-0 text-wa-muted transition-colors hover:text-wa-text"
              aria-label="Close search"
            >
              <X size={15} />
            </button>
          </div>

          {query && (
            <div className="absolute inset-x-3 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#11141f] p-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]">
              {results.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-wa-muted">
                  No messages found.
                </p>
              ) : (
                results.map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => jumpToMessage(message.id)}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11.5px] font-semibold text-wa-green">
                        {authorNameOf(message)}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-wa-muted">{message.time}</span>
                    </span>
                    <span className="line-clamp-2 text-[12px] leading-relaxed text-wa-text/85">
                      {message.text}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {selectMode && (
        <div className="animate-slide-down flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0d1019]/95 px-3 py-2 backdrop-blur">
          <button type="button" onClick={exitSelectMode} className="icon-btn" aria-label="Cancel selection">
            <X size={17} />
          </button>
          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-wa-text">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            onClick={forwardSelectedMessages}
            disabled={!selectedIds.length}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-[11.5px] font-medium text-wa-text transition-colors hover:bg-white/[0.12] disabled:opacity-40"
          >
            <Forward size={14} />
            Forward
          </button>
          <button
            type="button"
            onClick={deleteSelectedMessages}
            disabled={!selectedIds.length}
            className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-40"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="animate-slide-down shrink-0 border-b border-white/[0.06] bg-[#0d1019]/90 px-2 py-1.5 backdrop-blur">
          {pinnedMessages.map((message) => (
            <div
              key={message.id}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <button
                type="button"
                onClick={() => scrollToMessage(message.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <Pin size={14} className="shrink-0 rotate-45 text-wa-green" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold text-wa-text">
                    {message.from === 'me'
                      ? 'You'
                      : chat.members?.find((member) => member.id === message.senderId)?.name ||
                        'Member'}
                  </span>
                  <span className="block truncate text-[11px] text-wa-muted">
                    {message.text ||
                      (message.imageUrl
                        ? 'Photo'
                        : message.fileUrl
                          ? message.fileName || 'Attachment'
                          : 'Message')}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => togglePinnedMessage(message)}
                className="icon-btn shrink-0"
                aria-label="Unpin message"
                title="Unpin"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={() => {
          const node = scrollRef.current
          if (!node) return
          atBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120
        }}
        className="chat-wallpaper min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-5 sm:px-6"
        style={wallpaperPreset.style || undefined}
      >
        {timeline.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
              <Waves size={22} className="text-wa-green" />
            </div>
            <p className="text-[13.5px] font-medium text-wa-text">No messages yet</p>
            <p className="max-w-[240px] text-[12px] leading-relaxed text-wa-muted">
              {chat.isGroup
                ? 'Say hello to your group and start the conversation.'
                : `Say hello to ${chat.name} and start the conversation.`}
            </p>
          </div>
        )}
        {timeline.map((item) => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="flex justify-center py-2">
                <span className="rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-wa-muted backdrop-blur">
                  {item.label}
                </span>
              </div>
            )
          }
          if (item.type === 'unread') {
            return (
              <div key={item.key} className="flex items-center gap-2 px-2 py-1">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-wa-green/40" />
                <span className="rounded-full border border-wa-green/30 bg-wa-green/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wa-green">
                  Unread messages
                </span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-wa-green/40" />
              </div>
            )
          }
          const message = item.message
          return (
            <MessageBubble
              key={message.id}
              message={message}
              onReply={setReplyTo}
              onForward={onForward}
              onReact={onReact}
              onEdit={(target) => {
                setEditing(target)
                setReplyTo(null)
              }}
              onDelete={onDeleteMessage}
              onStar={onStarMessage}
              onPin={togglePinnedMessage}
              selectMode={selectMode}
              selected={selectedIds.includes(message.id)}
              onSelectToggle={handleSelectToggle}
              starred={starredIds?.has(message.id)}
              pinned={pinnedMessageIds.includes(message.id)}
              replyTo={replyMap[message.replyTo] || null}
              replyAuthorName={authorNameOf(replyMap[message.replyTo])}
              senderName={
                chat.isGroup && message.from !== 'me'
                  ? chat.members?.find((member) => member.id === message.senderId)?.name || 'Member'
                  : null
              }
            />
          )
        })}
        {typing && (
          <div className="bubble-in flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#151827] px-3.5 py-3 shadow-lg">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
            </div>
          </div>
        )}
      </div>

      <Composer
        onSend={onSend}
        onSendAttachment={onSendAttachment}
        uploading={uploading}
        onTyping={notifyTyping}
        replyTo={replyTo}
        replyAuthorName={authorNameOf(replyTo)}
        onCancelReply={() => setReplyTo(null)}
        draftKey={chat?.id ? `cw-draft:${user?.id || 'me'}:${chat.id}` : ''}
        editing={editing}
        onEdit={(text) => {
          if (!editing) return
          onEditMessage?.(editing, text)
          setEditing(null)
        }}
        onCancelEdit={() => setEditing(null)}
      />

      {infoOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setInfoOpen(false)}
            role="presentation"
          >
            <div
              className="glass-strong animate-pop-in max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={chat.isGroup ? 'Group info' : 'Contact info'}
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {chat.isGroup ? 'Group info' : 'Contact info'}
                </h3>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="icon-btn"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col items-center gap-3 px-6 pb-5 pt-7">
                <Avatar
                  name={chat.name}
                  color={chat.avatarColor}
                  src={chat.avatarUrl}
                  size="xl"
                  online={!chat.isGroup && chat.online}
                />
                <h2 className="text-[19px] font-semibold tracking-tight">{chat.name}</h2>
                <p className={`text-[12.5px] ${!chat.isGroup && chat.online ? 'text-accent-2' : 'text-wa-muted'}`}>
                  {chat.isGroup
                    ? `${chat.members?.length || chat.memberIds?.length || 0} members`
                    : chat.online
                      ? 'online'
                      : formatLastSeen(chat.lastSeen)}
                </p>
                {!chat.isGroup && chat.bio && (
                  <p className="max-w-[90%] text-center text-[12.5px] leading-relaxed text-wa-muted">
                    {chat.bio}
                  </p>
                )}
              </div>
              <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                {chat.isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setMembersOpen(true)
                      setInfoOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <Users size={18} className="text-wa-green" />
                    <span className="flex-1 text-[13.5px] text-wa-text">Manage members</span>
                    <span className="text-[12px] text-wa-muted">
                      {chat.members?.length || chat.memberIds?.length || 0}
                    </span>
                  </button>
                )}
                {chat.isGroup && <div className="mx-4 h-px bg-white/[0.06]" />}
                <button
                  type="button"
                  onClick={() => applyMute(muted ? null : 'forever')}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  {muted ? (
                    <BellOff size={18} className="text-wa-green" />
                  ) : (
                    <Bell size={18} className="text-wa-green" />
                  )}
                  <span className="flex-1 text-[13.5px] text-wa-text">
                    {muted ? 'Notifications muted' : 'Notifications on'}
                  </span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      muted ? 'bg-wa-green' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        muted ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <div className="mx-4 h-px bg-white/[0.06]" />
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Download size={18} className="text-wa-green" />
                  <span className="flex-1 text-[13.5px] text-wa-text">Shared photos</span>
                  <span className="text-[13px] text-wa-muted">
                    {chat.messages.filter((message) => message.imageUrl).length}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {starredOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setStarredOpen(false)}
            role="presentation"
          >
            <div
              className="glass-strong animate-pop-in max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Starred messages"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                  <Star size={16} className="text-amber-300" />
                  Starred messages
                </h3>
                <button
                  type="button"
                  onClick={() => setStarredOpen(false)}
                  className="icon-btn"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-2">
                {starredMessages.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-wa-muted">
                    No starred messages yet. Long-press a message and choose Star to keep it here.
                  </p>
                ) : (
                  starredMessages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => {
                        setStarredOpen(false)
                        jumpToMessage(message.id)
                      }}
                      className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-semibold text-wa-green">
                          {authorNameOf(message)}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-wa-muted">{message.time}</span>
                      </span>
                      <span className="line-clamp-2 text-[12px] leading-relaxed text-wa-text/85">
                        {message.imageUrl && !message.text ? 'Photo' : message.text}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {muteOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setMuteOpen(false)}
            role="presentation"
          >
            <div
              className="glass-strong animate-pop-in w-full max-w-xs overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Mute notifications"
            >
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-4">
                <Clock size={16} className="text-wa-green" />
                <h3 className="flex-1 text-[15px] font-semibold tracking-tight">Mute notifications</h3>
                <button
                  type="button"
                  onClick={() => setMuteOpen(false)}
                  className="icon-btn"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="p-2">
                {muted && (
                  <button
                    type="button"
                    onClick={() => applyMute(null)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-wa-text transition-colors hover:bg-white/[0.06]"
                  >
                    <Bell size={16} className="text-wa-green" />
                    Unmute notifications
                  </button>
                )}
                {MUTE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => applyMute(option.value)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-wa-text transition-colors hover:bg-white/[0.06]"
                  >
                    <BellOff size={16} className="text-wa-muted" />
                    {option.label}
                  </button>
                ))}
                <p className="px-3 pb-1 pt-2 text-[11px] leading-relaxed text-wa-muted">
                  You will still receive messages, just without alert sounds.
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}

      {wallpaperOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => setWallpaperOpen(false)}
            role="presentation"
          >
            <div
              className="glass-strong animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Chat wallpaper"
            >
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-4">
                <Palette size={16} className="text-wa-green" />
                <h3 className="flex-1 text-[15px] font-semibold tracking-tight">Chat wallpaper</h3>
                <button
                  type="button"
                  onClick={() => setWallpaperOpen(false)}
                  className="icon-btn"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                {WALLPAPERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.custom) {
                        customInputRef.current?.click()
                        return
                      }
                      setWallpaper(item.id)
                      if (chat?.id) {
                        window.localStorage.setItem(`cw-wallpaper:${chat.id}`, item.id)
                      }
                      showToast(`Wallpaper set to ${item.label}`)
                      setWallpaperOpen(false)
                    }}
                    className={`group relative h-24 overflow-hidden rounded-2xl border transition-all ${
                      wallpaper === item.id
                        ? 'border-wa-green shadow-[0_0_0_3px_rgba(124,92,255,0.18)]'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    {item.custom ? (
                      <span className="absolute inset-0 grid place-items-center bg-[#101322]">
                        {customWallpaper ? (
                          <img
                            src={customWallpaper}
                            alt="Your wallpaper"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlus size={22} className="text-wa-muted" />
                        )}
                      </span>
                    ) : (
                      <span
                        className="absolute inset-0 bg-[#101322] chat-wallpaper"
                        style={item.style || undefined}
                      />
                    )}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      {item.custom && customBusy ? 'Adding...' : item.label}
                      {wallpaper === item.id && <Check size={13} className="text-wa-green" />}
                    </span>
                  </button>
                ))}
              </div>
              <input
                ref={customInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomWallpaper}
              />
            </div>
          </div>,
          document.body
        )}

      {disappearingOpen &&
        createPortal(
          <DisappearingModal
            current={disappearingTimer}
            onSave={onSetTimer}
            onClose={() => setDisappearingOpen(false)}
          />,
          document.body
        )}

      {membersOpen && chat.isGroup &&
        createPortal(
          <GroupMembersModal
            chat={chat}
            contacts={contacts}
            currentUserId={user?.id}
            isAdmin={chat.createdBy ? chat.createdBy === user?.id : true}
            onClose={() => setMembersOpen(false)}
            onAdd={onAddMember}
            onRemove={onRemoveMember}
            onRename={onRenameGroup}
            onTransfer={onTransferAdmin}
            onDelete={onDeleteGroup}
            onLeave={() => {
              setMembersOpen(false)
              onRemoveMember?.(user?.id)
            }}
          />,
          document.body
        )}

      {toast && (
        <div className="animate-pop-in pointer-events-none absolute left-1/2 top-20 z-[95] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#151827]/95 px-4 py-2 text-[12px] text-wa-text shadow-xl backdrop-blur">
          {toast}
        </div>
      )}
    </section>
  )
}
