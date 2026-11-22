import { useEffect, useRef, useState } from 'react'
import { Check, Forward as ForwardIcon, ImagePlus, Loader2, Send, Sparkles, X } from 'lucide-react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { useChats } from '@/hooks/useChats'
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { usePresence } from '@/hooks/usePresence'
import { useCall } from '@/hooks/useCall'
import { useBlocked } from '@/hooks/useBlocked'
import { useStatuses } from '@/hooks/useStatuses'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { supabase } from '@/lib/supabase'
import { playSendSound } from '@/lib/sound'
import AppLock from '@/components/AppLock'
import AuthScreen from '@/pages/AuthScreen'
import CallOverlay from '@/components/CallOverlay'
import CallsPanel from '@/components/CallsPanel'
import CommunityPanel from '@/components/CommunityPanel'
import StatusPanel from '@/components/StatusPanel'
import ContactCard from '@/components/ContactCard'
import ContactActionsModal from '@/components/ContactActionsModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import GroupMembersModal from '@/components/GroupMembersModal'
import HelpAIModal from '@/components/HelpAIModal'
import ChatWindow from '@/components/ChatWindow'
import NewChatModal from '@/components/NewChatModal'
import Navigation, { TabPlaceholder } from '@/components/Navigation'
import NewGroupModal from '@/components/NewGroupModal'
import ProfileModal from '@/components/ProfileModal'
import QRScanner from '@/components/QRScanner'
import Avatar from '@/components/Avatar'

function ForwardModal({ targets, preview, onClose, onPick }) {
  const [busyId, setBusyId] = useState(null)

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Forward message"
    >
      <div
        className="glass-strong animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <ForwardIcon size={16} className="text-wa-green" />
              Forward message
            </h3>
            {preview && <p className="mt-0.5 truncate text-[11.5px] text-wa-muted">{preview}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {targets.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-wa-muted">
              No contacts or groups available to forward to.
            </p>
          ) : (
            targets.map((contact) => (
              <button
                key={`${contact.kind}-${contact.id}`}
                type="button"
                disabled={busyId !== null}
                onClick={() => {
                  setBusyId(contact.id)
                  onPick(contact)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50"
              >
                <Avatar name={contact.name} src={contact.avatarUrl} color={contact.avatarColor} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-wa-text">
                  {contact.name}
                </span>
                {busyId === contact.id ? (
                  <Loader2 size={16} className="animate-spin text-wa-green" />
                ) : (
                  <Send size={15} className="text-wa-muted" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
import Sidebar from '@/components/Sidebar'

function readIdSet(key) {
  if (typeof window === 'undefined' || !key) return new Set()
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]')
    return new Set(Array.isArray(value) ? value : [])
  } catch {
    return new Set()
  }
}

function ChatApp() {
  useVisualViewport()
  const { user, loading, signOut } = useAuth()
  const {
    incoming,
    call,
    localStream,
    remoteStream,
    facingMode,
    remoteFacingMode,
    videoFilter,
    remoteFilter,
    screenSharing,
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
    history: callHistory,
    removeHistoryEntry,
  } = useCall(user)
  const { blockedIds, isBlocked, block, unblock } = useBlocked(user)
  const {
    groups: statusGroups,
    loading: statusesLoading,
    addText: addStatusText,
    addImage: addStatusImage,
    remove: removeStatus,
    markViewed: markStatusViewed,
  } = useStatuses(user)
  const [activeId, setActiveId] = useState(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('chats')
  const [contactCard, setContactCard] = useState(null)
  const [quickChat, setQuickChat] = useState(null)
  const [quickMembersId, setQuickMembersId] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileTab, setProfileTab] = useState('profile')
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [theme, setTheme] = useState(() => window.localStorage.getItem('cw-theme') || 'dark')
  const awayFromHomeRef = useRef(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [lockEnabled, setLockEnabled] = useState(
    () => window.localStorage.getItem('cw-app-lock') === '1'
  )
  const [unlocked, setUnlocked] = useState(
    () => window.localStorage.getItem('cw-app-lock') !== '1'
  )
  const [lockAction, setLockAction] = useState(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    window.localStorage.setItem('cw-theme', theme)
  }, [theme])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const handler = (event) => setIsMobile(event.matches)
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  const handleToggleLock = () => setLockAction(lockEnabled ? 'disable' : 'set')

  const handleConfirmSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
      setSignOutOpen(false)
    }
  }

  const handleForgotPin = () => {
    window.localStorage.removeItem('cw-app-pin')
    window.localStorage.removeItem('cw-app-lock')
    setLockEnabled(false)
    setUnlocked(true)
    signOut()
  }

  const handleLockSuccess = (pin) => {
    if (lockAction === 'set') {
      window.localStorage.setItem('cw-app-pin', pin)
      window.localStorage.setItem('cw-app-lock', '1')
      setLockEnabled(true)
      setUnlocked(true)
    } else if (lockAction === 'disable') {
      window.localStorage.setItem('cw-app-lock', '0')
      window.localStorage.removeItem('cw-app-pin')
      setLockEnabled(false)
      setUnlocked(true)
    }
    setLockAction(null)
  }

  const [forwarding, setForwarding] = useState(null)

  useEffect(() => {
    const away =
      activeTab !== 'chats' ||
      mobileChatOpen ||
      profileOpen ||
      newChatOpen ||
      newGroupOpen ||
      Boolean(forwarding) ||
      Boolean(contactCard) ||
      Boolean(quickChat) ||
      Boolean(quickMembersId) ||
      helpOpen ||
      scannerOpen
    if (away && !awayFromHomeRef.current) {
      window.history.pushState({ chatwave: 'away' }, '')
      awayFromHomeRef.current = true
    } else if (!away) {
      awayFromHomeRef.current = false
    }
  }, [activeTab, mobileChatOpen, profileOpen, newChatOpen, newGroupOpen, forwarding, contactCard, quickChat, quickMembersId, helpOpen, scannerOpen])

  useEffect(() => {
    const goHome = () => {
      setActiveTab('chats')
      setMobileChatOpen(false)
      setActiveId(null)
      setProfileOpen(false)
      setNewChatOpen(false)
      setNewGroupOpen(false)
      setForwarding(null)
      setContactCard(null)
      setQuickChat(null)
      setQuickMembersId(null)
      setHelpOpen(false)
      setScannerOpen(false)
      awayFromHomeRef.current = false
    }
    window.addEventListener('popstate', goHome)
    return () => window.removeEventListener('popstate', goHome)
  }, [])
  const [soundOn, setSoundOn] = useState(
    () => typeof window === 'undefined' || window.localStorage.getItem('cw-sound') !== 'off'
  )
  const [starredIds, setStarredIds] = useState(() =>
    readIdSet(user?.id ? `cw-starred:${user.id}` : '')
  )
  const [pinnedIds, setPinnedIds] = useState(() =>
    readIdSet(user?.id ? `cw-pinned:${user.id}` : '')
  )
  const [archivedIds, setArchivedIds] = useState(() =>
    readIdSet(user?.id ? `cw-archived:${user.id}` : '')
  )
  const [unreadAnchor, setUnreadAnchor] = useState(null)

  const {
    chats,
    contacts,
    me: myProfile,
    loading: chatsLoading,
    sendMessage,
    startChat,
    startGroupChat,
    addGroupMember,
    removeGroupMember,
    renameGroup,
    transferGroupAdmin,
    deleteGroup,
    setDisappearingTimer,
    markRead,
    markUnread,
    clearChat,
    reactToMessage,
    editMessage,
    deleteMessage,
    reload,
  } = useChats(user, activeId)
  const onlineIds = usePresence(user)
  useNotificationSound(soundOn)
  useDesktopNotifications()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const chatId = params.get('chat')
    if (!chatId) return
    params.delete('chat')
    const query = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
    setActiveId(chatId)
    setMobileChatOpen(true)
    markRead(chatId)
  }, [markRead])

  const toggleSound = () => {
    setSoundOn((current) => {
      window.localStorage.setItem('cw-sound', current ? 'off' : 'on')
      return !current
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.classList.toggle(
      'reduce-motion',
      window.localStorage.getItem('cw-reduce-motion') === '1'
    )
  }, [])

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    window.localStorage.setItem(`cw-starred:${user.id}`, JSON.stringify([...starredIds]))
    window.localStorage.setItem(`cw-pinned:${user.id}`, JSON.stringify([...pinnedIds]))
    window.localStorage.setItem(`cw-archived:${user.id}`, JSON.stringify([...archivedIds]))
  }, [starredIds, pinnedIds, archivedIds, user?.id])

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread || 0), 0)
  useEffect(() => {
    document.title = totalUnread ? `(${totalUnread}) ChatWave` : 'ChatWave'
  }, [totalUnread])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    const onMessage = (event) => {
      if (event.data?.type === 'cw:restore-call') restoreCall()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [restoreCall])

  const openProfile = (tab = 'profile') => {
    setProfileTab(tab)
    setProfileOpen(true)
  }

  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-wa-bg">
        <div className="relative grid place-items-center">
          <span className="absolute h-24 w-24 animate-ping rounded-full bg-wa-green/10" />
          <div className="ring-gradient grid h-14 w-14 place-items-center rounded-2xl shadow-[0_20px_50px_-18px_rgba(124,92,255,0.9)]"><img src="/logo.jpg" alt="ChatWave" className="h-8 w-8 animate-pulse" /></div>
        </div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  const me = {
    name: myProfile?.name || user.user_metadata?.full_name || user.email.split('@')[0],
    username:
      myProfile?.username || user.user_metadata?.username || '',
    avatarUrl: myProfile?.avatar_url || null,
    color: myProfile?.avatar_color || '#7c5cff',
    bio: myProfile?.bio || '',
  }
  const chatsWithPresence = chats.map((chat) => {
    const otherId = chat.memberIds.find((id) => id !== user.id)
    return {
      ...chat,
      online: otherId ? onlineIds.has(otherId) : false,
      members: (chat.members || []).map((member) => ({
        ...member,
        online: onlineIds.has(member.id),
      })),
    }
  })
  const visibleContacts = contacts.filter((contact) => !blockedIds.has(contact.id))
  const forwardTargets = [
    ...visibleContacts.map((contact) => ({ ...contact, kind: 'contact' })),
    ...chatsWithPresence
      .filter((chat) => chat.isGroup)
      .map((chat) => ({
        id: chat.id,
        name: chat.name,
        avatarUrl: chat.avatarUrl,
        avatarColor: chat.avatarColor,
        kind: 'group',
      })),
  ]
  const activeChat = chatsWithPresence.find((chat) => chat.id === activeId)
  const mobileNavVisible = activeTab !== 'chats' || !mobileChatOpen

  const startCallFor = (chat, withVideo = false) => {
    if (!chat || chat.isGroup) return
    if (isBlocked(otherIdOf(chat))) {
      showToast('You blocked this contact.')
      return
    }
    const peerId = chat.memberIds.find((id) => id !== user.id)
    if (!peerId) return
    startCall({
      conversationId: chat.id,
      peerId,
      peerName: chat.name,
      peerAvatar: chat.avatarUrl,
      peerColor: chat.avatarColor,
      selfAvatar: me.avatarUrl,
      selfColor: me.color,
      withVideo,
    })
  }

  const handleCall = ({ withVideo = false } = {}) => startCallFor(activeChat, withVideo)

  const handleSelect = (id) => {
    const target = chatsWithPresence.find((chat) => chat.id === id)
    const readAt = target?.myReadAt
    const firstUnread = target?.messages.find(
      (message) =>
        message.from === 'them' && (!readAt || new Date(message.createdAt) > new Date(readAt))
    )
    setUnreadAnchor(firstUnread ? { chatId: id, messageId: firstUnread.id } : null)
    setActiveId(id)
    markRead(id)
    setMobileChatOpen(true)
  }

  const handleQuickChat = (chat) => {
    setQuickChat(null)
    handleSelect(chat.id)
  }

  const handleQuickCall = (chat, withVideo) => {
    setQuickChat(null)
    startCallFor(chat, withVideo)
  }

  const handleQuickInfo = (chat) => {
    setQuickChat(null)
    if (!chat.isGroup) {
      setContactCard({ ...chat, userId: user.id })
      return
    }
    setActiveId(chat.id)
    markRead(chat.id)
    setMobileChatOpen(true)
    setQuickMembersId(chat.id)
  }

  const handleSend = async (text, options) => {
    if (!activeId) return
    if (isBlocked(otherIdOf(activeChat))) {
      showToast('You blocked this contact.')
      return
    }
    if (soundOn) window.setTimeout(playSendSound, 0)
    const { error } = await sendMessage(activeId, text, null, {
      ...options,
      timer: activeChat?.disappearingTimer,
    })
    if (error) showToast('Message could not be sent.')
  }

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  const showSuccess = (message) => {
    setSuccessNotice(message)
    window.setTimeout(() => setSuccessNotice(''), 3000)
  }

  const handleSendAttachment = async (file, options = {}) => {
    if (!activeId || !user) return

    const kind = options.kind || (file.type.startsWith('image/') ? 'image' : 'document')
    const isImage = kind === 'image'
    const limit = isImage ? 5 * 1024 * 1024 : 25 * 1024 * 1024

    if (file.size > limit) {
      showToast(isImage ? 'Image must be under 5 MB.' : 'File must be under 25 MB.')
      return
    }

    const bucket = isImage ? 'chat-images' : 'chat-files'
    const safeName = file.name.replace(/[^\w.-]+/g, '_') || 'attachment'
    const path = `${user.id}/${activeId}/${crypto.randomUUID()}-${safeName}`

    setUploading(true)
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: (file.type || 'application/octet-stream').split(';')[0],
      cacheControl: '3600',
    })

    if (error) {
      setUploading(false)
      showToast(
        isImage
          ? error.message
          : 'File upload failed. Run supabase/schema8.sql to enable attachments.'
      )
      return
    }

    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    if (soundOn) playSendSound()

    const contentType = (file.type || 'application/octet-stream').split(';')[0]
      const { error: sendError } = await sendMessage(activeId, options.caption || '', isImage ? url : null, {
        replyTo: options.replyTo,
        fileUrl: isImage ? undefined : url,
        fileName: file.name,
        fileType: contentType,
        fileSize: file.size,
        timer: activeChat?.disappearingTimer,
      })

    setUploading(false)
    if (sendError) showToast(sendError.message || 'Could not send the attachment.')
  }

  const handleReact = (message, emoji) => {
    if (!activeId) return
    reactToMessage(activeId, message.id, emoji)
  }

  const handleEditMessage = async (message, text) => {
    if (!activeId) return
    const ok = await editMessage(activeId, message.id, text)
    if (!ok) showToast('Could not edit the message.')
  }

  const handleDeleteMessage = async (message, forEveryone) => {
    if (!activeId) return
    const ok = await deleteMessage(activeId, message.id, forEveryone)
    if (!ok) showToast('Could not delete the message.')
  }

  const handleStarMessage = (message) => {
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(message.id)) next.delete(message.id)
      else next.add(message.id)
      return next
    })
  }

  const toggleId = (setter, id) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleForwardPick = async (target) => {
    const message = forwarding
    setForwarding(null)
    if (!message) return

    const id = target.kind === 'group' ? target.id : await startChat(target.id)
    if (!id) {
      showToast('Could not forward the message.')
      return
    }
    const messages = message.bulk?.length ? message.bulk : [message]
    let failed = false
    for (const item of messages) {
      const { error } = await sendMessage(id, item.text || '', item.imageUrl || null, {
        forwarded: true,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileType: item.fileType,
        fileSize: item.fileSize,
        timer: chatsWithPresence.find((chat) => chat.id === id)?.disappearingTimer,
      })
      if (error) {
        failed = true
        break
      }
    }
    if (failed) {
      showToast('Could not forward the message.')
      return
    }
    showToast(messages.length > 1 ? `${messages.length} messages forwarded ✓` : 'Message forwarded ✓')
  }

  const handlePick = async (contactId) => {
    const id = await startChat(contactId)
    setNewChatOpen(false)
    if (id) {
      setUnreadAnchor(null)
      setActiveId(id)
      markRead(id)
      setMobileChatOpen(true)
    }
  }

  const handleCreateGroup = async (name, memberIds) => {
    const id = await startGroupChat(name, memberIds)
    if (!id) {
      showToast('Could not create the group.')
      return null
    }
    setUnreadAnchor(null)
    setActiveId(id)
    markRead(id)
    setMobileChatOpen(true)
    return id
  }

  const handleAddMember = async (memberId) => {
    if (!activeId) return false
    const ok = await addGroupMember(activeId, memberId)
    if (!ok) showToast('Could not add the member.')
    return ok
  }

  const handleRemoveMember = async (memberId) => {
    if (!activeId) return false
    const ok = await removeGroupMember(activeId, memberId)
    if (!ok) showToast('Could not remove the member.')
    if (ok && memberId === user.id) {
      setActiveId(null)
      setMobileChatOpen(false)
    }
    return ok
  }

  const handleRenameGroup = async (name) => {
    if (!activeId) return false
    const ok = await renameGroup(activeId, name)
    if (!ok) showToast('Could not rename the group.')
    return ok
  }

  const handleTransferAdmin = async (memberId) => {
    if (!activeId) return false
    const ok = await transferGroupAdmin(activeId, memberId)
    if (!ok) showToast('Could not transfer admin rights.')
    return ok
  }

  const handleDeleteGroup = async () => {
    if (!activeId) return false
    const ok = await deleteGroup(activeId)
    if (!ok) showToast('Could not delete the group.')
    else {
      setActiveId(null)
      setMobileChatOpen(false)
    }
    return ok
  }

  const otherIdOf = (chat) => chat?.memberIds?.find((id) => id !== user.id)

  const handleToggleMuteChat = (id) => {
    const key = `cw-muted:${id}`
    const raw = window.localStorage.getItem(key)
    const muted = Boolean(raw && raw !== '0')
    window.localStorage.setItem(key, muted ? '0' : 'forever')
    showToast(muted ? 'Notifications unmuted' : 'Notifications muted')
  }

  const handleToggleBlock = async (chat) => {
    const otherId = otherIdOf(chat)
    if (!otherId) return
    if (isBlocked(otherId)) {
      const ok = await unblock(otherId)
      showToast(ok ? 'Contact unblocked' : 'Could not unblock')
    } else {
      const ok = await block(otherId)
      showToast(ok ? 'Contact blocked' : 'Could not block')
    }
  }

  const handleCopyUsername = async (chat) => {
    const username = chat.members?.find((member) => member.id === otherIdOf(chat))?.username
    if (!username) {
      showToast('This contact has no username')
      return
    }
    await navigator.clipboard?.writeText(`@${username}`)
    showToast('Username copied')
  }

  const handleOpenGroup = (id) => {
    setActiveTab('chats')
    setActiveId(id)
    markRead(id)
    setMobileChatOpen(true)
  }

  const handleStartCallFromContact = (contact, withVideo = false) => {
    startCall({
      conversationId: null,
      peerId: contact.id,
      peerName: contact.name,
      peerAvatar: contact.avatarUrl,
      peerColor: contact.avatarColor,
      selfAvatar: me.avatarUrl,
      selfColor: me.color,
      withVideo,
    })
  }

  const handleQrPick = async (username) => {
    setScannerOpen(false)
    const clean = String(username || '').trim().toLowerCase()
    if (!clean) {
      showToast('Invalid QR code')
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .maybeSingle()
    if (error || !data) {
      showToast('No account found with that username')
      return
    }
    if (data.id === user.id) {
      showToast('That is your own QR code')
      return
    }
    handlePick(data.id)
  }

  const handleSetTimer = async (timer) => {
    if (!activeId) return false
    const ok = await setDisappearingTimer(activeId, timer)
    if (!ok) showToast('Could not update disappearing messages.')
    return ok
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-wa-bg">
      <div className={`flex min-h-0 flex-1 md:pb-0 ${mobileNavVisible ? 'pb-16' : ''}`}>
        <Navigation active={activeTab} onChange={setActiveTab} />
        {activeTab === 'chats' ? (
          <>
            <Sidebar
        chats={chatsWithPresence}
        activeId={activeId}
        onSelect={handleSelect}
        onAvatarClick={(chat) => setQuickChat(chat)}
        onNewChat={() => setNewChatOpen(true)}
        onNewGroup={() => setNewGroupOpen(true)}
        onScan={() => setScannerOpen(true)}
        onSignOut={() => setSignOutOpen(true)}
        onProfile={() => openProfile('profile')}
        onSettings={() => openProfile('settings')}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        chatMenu={{
          userId: user.id,
          isBlocked,
          onMarkRead: markRead,
          onMarkUnread: markUnread,
          onTogglePin: (id) => toggleId(setPinnedIds, id),
          onToggleArchive: (id) => toggleId(setArchivedIds, id),
          onToggleMute: handleToggleMuteChat,
          onViewProfile: (chat) => setContactCard({ ...chat, userId: user.id }),
          onToggleBlock: handleToggleBlock,
          onCopyUsername: handleCopyUsername,
          onClearChat: clearChat,
        }}
        loading={chatsLoading}
        pinnedIds={pinnedIds}
        archivedIds={archivedIds}
        className={mobileChatOpen ? 'hidden md:flex' : 'flex'}
      />
      <ChatWindow
        chat={activeChat}
        user={user}
        onSend={handleSend}
        onSendAttachment={handleSendAttachment}
        uploading={uploading}
        onBack={() => {
          setMobileChatOpen(false)
          setActiveId(null)
        }}
        onReact={handleReact}
        onForward={setForwarding}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onStarMessage={handleStarMessage}
        starredIds={starredIds}
        pinned={activeChat ? pinnedIds.has(activeChat.id) : false}
        archived={activeChat ? archivedIds.has(activeChat.id) : false}
        onTogglePin={() => activeId && toggleId(setPinnedIds, activeId)}
        onToggleArchive={() => activeId && toggleId(setArchivedIds, activeId)}
        onCall={handleCall}
        disappearingTimer={activeChat?.disappearingTimer || 'off'}
        onSetTimer={handleSetTimer}
        contacts={visibleContacts}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onRenameGroup={handleRenameGroup}
        onTransferAdmin={handleTransferAdmin}
        onDeleteGroup={handleDeleteGroup}
        unreadAnchorId={
          unreadAnchor && activeChat && unreadAnchor.chatId === activeChat.id
            ? unreadAnchor.messageId
            : null
        }
            className={mobileChatOpen ? 'flex' : 'hidden md:flex'}
          />
          </>
        ) : activeTab === 'status' ? (
          <StatusPanel
            groups={statusGroups}
            myUserId={user.id}
            loading={statusesLoading}
            onAddText={addStatusText}
            onAddImage={addStatusImage}
            onRemove={removeStatus}
            onViewed={markStatusViewed}
          />
        ) : activeTab === 'community' ? (
          <CommunityPanel
            groups={chatsWithPresence.filter((chat) => chat.isGroup)}
            onOpenGroup={handleOpenGroup}
            onCreate={() => setNewGroupOpen(true)}
          />
        ) : activeTab === 'calls' ? (
          <CallsPanel
            history={callHistory}
            onRemove={removeHistoryEntry}
            contacts={visibleContacts}
            onStartCall={handleStartCallFromContact}
          />
        ) : (
          <TabPlaceholder tab={activeTab} />
        )}
      </div>
      {activeTab === 'chats' && !mobileChatOpen && !helpOpen && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="animate-pop-in fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-wa-green to-accent-2 text-white shadow-[0_12px_30px_-8px_rgba(16,185,129,0.8)] transition-transform hover:scale-105 active:scale-95 md:hidden"
          aria-label="ChatWave AI help"
          title="Ask ChatWave AI"
        >
          <Sparkles size={20} />
        </button>
      )}
      {!helpOpen && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="fixed bottom-6 left-[13px] z-40 hidden h-11 w-11 place-items-center rounded-2xl border border-wa-green/25 bg-wa-green/10 text-wa-green shadow-lg transition-colors hover:bg-wa-green/20 md:grid"
          aria-label="ChatWave AI help"
          title="Ask ChatWave AI"
        >
          <Sparkles size={19} />
        </button>
      )}
      {helpOpen && <HelpAIModal onClose={() => setHelpOpen(false)} />}
      {mobileNavVisible && <Navigation mobile active={activeTab} onChange={setActiveTab} />}
      {forwarding && (
        <ForwardModal
          targets={forwardTargets}
          preview={
            forwarding.bulk?.length
              ? `${forwarding.bulk.length} messages`
              : forwarding.imageUrl && !forwarding.text
              ? '📷 Photo'
              : forwarding.fileUrl && !forwarding.text
                ? forwarding.fileName || 'Attachment'
                : forwarding.text
          }
          onClose={() => setForwarding(null)}
          onPick={handleForwardPick}
        />
      )}
      {newChatOpen && (
        <NewChatModal
          contacts={visibleContacts}
          onClose={() => setNewChatOpen(false)}
          onPick={handlePick}
        />
      )}
      {newGroupOpen && (
        <NewGroupModal
          contacts={visibleContacts}
          onClose={() => setNewGroupOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}
      {scannerOpen && (
        <QRScanner onClose={() => setScannerOpen(false)} onPick={handleQrPick} />
      )}
      {contactCard && (
        <ContactCard
          chat={contactCard}
          blocked={isBlocked(otherIdOf(contactCard))}
          onClose={() => setContactCard(null)}
          onToggleBlock={handleToggleBlock}
        />
      )}
      {quickChat &&
        (() => {
          const target = chatsWithPresence.find((chat) => chat.id === quickChat.id) || quickChat
          return (
            <ContactActionsModal
              chat={{ ...target, userId: user.id }}
              isGroup={Boolean(target.isGroup)}
              onClose={() => setQuickChat(null)}
              onChat={() => handleQuickChat(target)}
              onCall={() => handleQuickCall(target, false)}
              onVideo={() => handleQuickCall(target, true)}
              onInfo={() => handleQuickInfo(target)}
            />
          )
        })()}
      {quickMembersId &&
        (() => {
          const target = chatsWithPresence.find((chat) => chat.id === quickMembersId)
          if (!target) return null
          return (
            <GroupMembersModal
              chat={target}
              contacts={visibleContacts}
              currentUserId={user.id}
              isAdmin={target.createdBy ? target.createdBy === user.id : true}
              onClose={() => setQuickMembersId(null)}
              onAdd={handleAddMember}
              onRemove={handleRemoveMember}
              onRename={handleRenameGroup}
              onTransfer={handleTransferAdmin}
              onDelete={handleDeleteGroup}
              onLeave={() => {
                setQuickMembersId(null)
                handleRemoveMember(user.id)
              }}
            />
          )
        })()}
      <CallOverlay
        incoming={incoming}
        call={call}
        localStream={localStream}
        remoteStream={remoteStream}
        facingMode={facingMode}
        remoteFacingMode={remoteFacingMode}
        videoFilter={videoFilter}
        remoteFilter={remoteFilter}
        screenSharing={screenSharing}
        minimized={minimized}
        onMinimize={minimizeCall}
        onRestore={restoreCall}
        notice={notice}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onSwitchCamera={switchCamera}
        onToggleScreenShare={screenSharing ? stopScreenShare : startScreenShare}
        onFilterChange={applyVideoFilter}
      />
      {profileOpen && (
        <ProfileModal
          user={user}
          onOpenHelp={() => setHelpOpen(true)}
          currentName={me.name}
          currentUsername={me.username}
          currentAvatarUrl={me.avatarUrl}
          currentBio={me.bio}
          currentColor={me.color}
          initialTab={profileTab}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          isMobile={isMobile}
          lockEnabled={lockEnabled}
          onToggleLock={handleToggleLock}
          onClose={() => setProfileOpen(false)}
          onSaved={reload}
          onNotice={showSuccess}
          onError={showToast}
          onSignOut={() => setSignOutOpen(true)}
        />
      )}
      <ConfirmDialog
        open={signOutOpen}
        busy={signingOut}
        title="Log out of ChatWave?"
        description="You will need to sign in again to continue. Your chats and settings stay safe."
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleConfirmSignOut}
      />
      {successNotice && (
        <div className="animate-pop-in fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-wa-green/25 bg-[#0f2018]/95 px-4 py-2.5 text-[12px] text-emerald-200 shadow-2xl backdrop-blur">
          <Check size={15} className="shrink-0 text-wa-green" />
          {successNotice}
        </div>
      )}
      {toast && (
        <div className="animate-pop-in fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-red-400/25 bg-[#1a1020]/95 px-4 py-2.5 text-[12px] text-red-200 shadow-2xl backdrop-blur">
          <ImagePlus size={15} className="shrink-0 text-red-300" />
          {toast}
          <button
            type="button"
            onClick={() => setToast('')}
            className="ml-1 text-red-300/70 transition-colors hover:text-white"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {isMobile && lockEnabled && !unlocked && !lockAction && (
        <AppLock
          mode="verify"
          expectedPin={window.localStorage.getItem('cw-app-pin') || ''}
          onSuccess={() => setUnlocked(true)}
          onForgot={handleForgotPin}
        />
      )}
      {isMobile && lockAction && (
        <AppLock
          mode={lockAction}
          expectedPin={window.localStorage.getItem('cw-app-pin') || ''}
          onSuccess={handleLockSuccess}
          onCancel={() => setLockAction(null)}
        />
      )}
    </div>
  )
}

function AuthGate() {
  const { user } = useAuth()
  return <ChatApp key={user?.id ?? 'guest'} />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}




