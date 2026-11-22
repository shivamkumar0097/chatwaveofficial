import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PALETTE = ['#6a5acd', '#e91e63', '#00897b', '#f57c00', '#8e24aa', '#1e88e5', '#43a047', '#d81b60']

const PROFILE_COLUMNS = 'id, name, username, avatar_color, avatar_url, last_seen, bio'
const PROFILE_COLUMNS_BASE = 'id, name, avatar_color, avatar_url, last_seen'

const readReceiptsEnabled = () =>
  typeof window === 'undefined' || window.localStorage.getItem('cw-read-receipts') !== '0'

const colorFor = (id) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

const labelOf = (iso) => {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return timeOf(iso)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const myReadAtFor = (rows, conversationId, myId) =>
  rows.find((row) => row.conversation_id === conversationId && row.user_id === myId)?.last_read_at ??
  null

const otherReadAtFor = (rows, conversationId, myId) =>
  rows
    .filter((row) => row.conversation_id === conversationId && row.user_id !== myId)
    .reduce(
      (max, row) => (!max || row.last_read_at > max ? row.last_read_at : max),
      null
    )

const readMapFor = (rows, conversationId) => {
  const map = {}
  for (const row of rows) {
    if (row.conversation_id === conversationId) map[row.user_id] = row.last_read_at
  }
  return map
}

const statusFor = (createdAt, myId, memberIds, isGroup, readMap) => {
  if (!isGroup) {
    const otherReadAt = Object.entries(readMap || {}).find(([id]) => id !== myId)?.[1] ?? null
    return otherReadAt && new Date(otherReadAt) >= new Date(createdAt) ? 'read' : 'delivered'
  }
  const others = (memberIds || []).filter((id) => id !== myId)
  if (!others.length) return 'delivered'
  return others.every(
    (id) => readMap?.[id] && new Date(readMap[id]) >= new Date(createdAt)
  )
    ? 'read'
    : 'delivered'
}

const readContextOf = (chat) => ({
  memberIds: chat.memberIds || [],
  isGroup: Boolean(chat.isGroup),
  readMap: chat.readMap || {},
})

const groupReactions = (raw) => {
  const grouped = {}
  for (const emoji of Object.values(raw || {})) {
    if (emoji) grouped[emoji] = (grouped[emoji] || 0) + 1
  }
  return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }))
}

const TIMERS = ['off', '24h', 'view_once']

const normalizeTimer = (value) => (TIMERS.includes(value) ? value : 'off')

const isMessageExpired = (message) =>
  Boolean(message.expiresAt && new Date(message.expiresAt) <= new Date())

const hiddenKey = (userId) => `cw-hidden:${userId}`

const readHidden = (userId) => {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(hiddenKey(userId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeHidden = (userId, messageId) => {
  if (typeof window === 'undefined') return
  try {
    const next = [...new Set([...readHidden(userId), messageId])].slice(-1000)
    window.localStorage.setItem(hiddenKey(userId), JSON.stringify(next))
  } catch {}
}

const mapMessage = (row, myId, readContext = {}) => {
  const mine = row.sender_id === myId
  const deleted = Boolean(row.deleted_for_all)
  const { memberIds = [], isGroup = false, readMap = {} } = readContext
  const rawReactions = deleted
    ? {}
    : row.reactions && typeof row.reactions === 'object'
      ? row.reactions
      : {}
  return {
    id: row.id,
    senderId: row.sender_id,
    from: mine ? 'me' : 'them',
    text: deleted ? '' : row.content || '',
    imageUrl: deleted ? null : row.image_url || null,
    fileUrl: deleted ? null : row.file_url || null,
    fileName: deleted ? null : row.file_name || null,
    fileType: deleted ? null : row.file_type || null,
    fileSize: deleted ? null : row.file_size || null,
    time: timeOf(row.created_at),
    createdAt: row.created_at,
    replyTo: row.reply_to || null,
    reaction: rawReactions[myId] ?? null,
    reactionList: groupReactions(rawReactions),
    reactionsRaw: rawReactions,
    forwarded: Boolean(row.forwarded),
    edited: Boolean(row.edited_at),
    deleted,
    expiresAt: row.expires_at || null,
    viewOnce: Boolean(row.view_once),
    viewedBy:
      row.viewed_by && typeof row.viewed_by === 'object' ? row.viewed_by : {},
    status: mine ? statusFor(row.created_at, myId, memberIds, isGroup, readMap) : undefined,
  }
}

export function useChats(user, activeId) {
  const [chats, setChats] = useState([])
  const [contacts, setContacts] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(activeId)
  const chatsRef = useRef(chats)
  const loadGenerationRef = useRef(0)

  useEffect(() => {
    activeRef.current = activeId
  }, [activeId])

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  const load = useCallback(async () => {
    if (!user) return
    const generation = ++loadGenerationRef.current
    setLoading(true)
    try {
      const displayName =
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'ChatWave User'

      await supabase
        .from('profiles')
        .upsert({ id: user.id, name: displayName }, { onConflict: 'id', ignoreDuplicates: true })

      const fetchProfiles = async () => {
        const attempt = await supabase.from('profiles').select(PROFILE_COLUMNS)
        if (!attempt.error) return attempt.data ?? []
        // bio column not migrated yet (schema7.sql not applied) — fall back
        const fallback = await supabase.from('profiles').select(PROFILE_COLUMNS_BASE)
        return fallback.data ?? []
      }

      const [allProfiles, membershipResult] = await Promise.all([
        fetchProfiles(),
        supabase
          .from('conversation_members')
          .select('conversation_id, conversations(id, is_group, title, created_by, disappearing_timer)')
          .eq('user_id', user.id),
      ])

      if (generation !== loadGenerationRef.current) return

      setMe(allProfiles.find((profile) => profile.id === user.id) ?? null)
      setContacts(
        allProfiles
          .filter((profile) => profile.id !== user.id)
          .map((profile) => ({
            id: profile.id,
            name: profile.name,
            username: profile.username || '',
            avatarColor: profile.avatar_color || colorFor(profile.id),
            avatarUrl: profile.avatar_url || null,
            bio: profile.bio || '',
          }))
      )

      const conversations = (membershipResult.data ?? [])
        .map((row) => row.conversations)
        .filter(Boolean)
      const ids = conversations.map((conversation) => conversation.id)

      let memberRows = []
      let messageRows = []
      let readRows = []

      if (ids.length) {
        const baseSelect = 'id, conversation_id, sender_id, content, image_url, created_at'
        const midSelect = `${baseSelect}, reply_to, reactions, forwarded, edited_at, deleted_for_all, file_url, file_name, file_type, file_size`
        const fullSelect = `${midSelect}, expires_at, view_once, viewed_by`

        const fetchMessages = async () => {
          const query = (select) =>
            supabase
              .from('messages')
              .select(select)
              .in('conversation_id', ids)
              .order('created_at', { ascending: true })
              .limit(1000)

          const attempt = await query(fullSelect)
          if (!attempt.error) return attempt.data ?? []
          const midAttempt = await query(midSelect)
          if (!midAttempt.error) return midAttempt.data ?? []
          const fallback = await query(baseSelect)
          return fallback.data ?? []
        }

        const fetchMembers = async () => {
          const attempt = await supabase
            .from('conversation_members')
            .select(`conversation_id, user_id, profiles(${PROFILE_COLUMNS})`)
            .in('conversation_id', ids)
          if (!attempt.error) return attempt.data ?? []
          const fallback = await supabase
            .from('conversation_members')
            .select(`conversation_id, user_id, profiles(${PROFILE_COLUMNS_BASE})`)
            .in('conversation_id', ids)
          return fallback.data ?? []
        }

        const [membersData, messagesData, readsResult] = await Promise.all([
          fetchMembers(),
          fetchMessages(),
          supabase
            .from('conversation_reads')
            .select('conversation_id, user_id, last_read_at')
            .in('conversation_id', ids),
        ])
        memberRows = membersData
        messageRows = messagesData
        readRows = readsResult.data ?? []
      }

      const hidden = new Set(readHidden(user.id))

      const built = conversations.map((conversation) => {
        const memberIds = memberRows
          .filter((row) => row.conversation_id === conversation.id)
          .map((row) => row.user_id)
        const members = memberRows
          .filter((row) => row.conversation_id === conversation.id)
          .map((row) => ({
            id: row.user_id,
            name: row.profiles?.name || 'Member',
            username: row.profiles?.username || '',
            avatarColor: row.profiles?.avatar_color || colorFor(row.user_id),
            avatarUrl: row.profiles?.avatar_url || null,
            bio: row.profiles?.bio || '',
          }))
        const other = members.find((member) => member.id !== user.id)
        const isGroup = Boolean(conversation.is_group)
        const name =
          conversation.title ||
          members.filter((member) => member.id !== user.id).map((member) => member.name).join(', ') ||
          'Saved messages'
        const otherReadAt = otherReadAtFor(readRows, conversation.id, user.id)
        const readMap = readMapFor(readRows, conversation.id)
        const myReadAt = myReadAtFor(readRows, conversation.id, user.id)
        const readContext = { memberIds, isGroup, readMap }
        const messages = messageRows
          .filter((row) => row.conversation_id === conversation.id && !hidden.has(row.id))
          .map((row) => mapMessage(row, user.id, readContext))
          .filter((message) => !isMessageExpired(message))
        const unread = messages.filter(
          (message) =>
            message.from === 'them' &&
            (!myReadAt || new Date(message.createdAt) > new Date(myReadAt))
        ).length

        return {
          id: conversation.id,
          name,
          avatarColor: isGroup ? colorFor(conversation.id) : other?.avatarColor || colorFor(conversation.id),
          avatarUrl: isGroup ? null : other?.avatarUrl || null,
          bio: isGroup ? '' : other?.bio || '',
          isGroup,
          createdBy: conversation.created_by || null,
          disappearingTimer: normalizeTimer(conversation.disappearing_timer),
          members,
          memberIds,
          lastSeen: other?.last_seen ?? null,
          myReadAt,
          otherReadAt,
          readMap,
          online: false,
          typing: false,
          unread,
          lastTime: labelOf(messages[messages.length - 1]?.createdAt),
          messages,
        }
      })

      built.sort((a, b) => {
        const aTime = a.messages[a.messages.length - 1]?.createdAt ?? ''
        const bTime = b.messages[b.messages.length - 1]?.createdAt ?? ''
        return bTime.localeCompare(aTime)
      })

      if (generation !== loadGenerationRef.current) return

      setChats(built)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          messages: chat.messages.filter((message) => !isMessageExpired(message)),
        }))
      )
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user) return undefined

    const channel = supabase
      .channel('chatwave-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new
          const isActive = row.conversation_id === activeRef.current
          const chat = chatsRef.current.find((item) => item.id === row.conversation_id)
          const known = Boolean(chat)

          if (row.sender_id !== user.id && (!isActive || document.hidden)) {
            const preview = row.view_once
              ? 'View once message'
              : row.deleted_for_all
                ? 'Message deleted'
                : row.content ||
                  (row.image_url ? 'Photo' : row.file_url ? row.file_name || 'Attachment' : 'New message')
            window.dispatchEvent(
              new CustomEvent('chatwave:incoming', {
                detail: {
                  conversationId: row.conversation_id,
                  body: preview,
                  senderName: chat?.name || 'ChatWave',
                },
              })
            )
          }

          if (row.view_once && isActive && row.sender_id !== user.id) {
            const now = new Date().toISOString()
            supabase
              .from('messages')
              .update({
                expires_at: now,
                viewed_by: { [user.id]: now },
                content: '',
                image_url: null,
                file_url: null,
                file_name: null,
                file_type: null,
                file_size: null,
              })
              .eq('id', row.id)
              .then(() => {})
          }

          if (row.sender_id !== user.id && isActive && readReceiptsEnabled()) {
            supabase
              .from('conversation_reads')
              .upsert(
                {
                  conversation_id: row.conversation_id,
                  user_id: user.id,
                  last_read_at: new Date().toISOString(),
                },
                { onConflict: 'conversation_id,user_id' }
              )
              .then(() => {})
          }

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              const base = chat.messages.filter((message) => {
                if (!message.pending || message.senderId !== user.id) return true
                const sameText = (message.text || '') === (row.content || '')
                const recent =
                  Math.abs(new Date(message.createdAt) - new Date(row.created_at)) < 10000
                return !(sameText && recent)
              })
              if (base.some((message) => message.id === row.id)) return { ...chat, messages: base }
              if (row.view_once && isActive && row.sender_id !== user.id) {
                return { ...chat, messages: base }
              }
              const next = mapMessage(row, user.id, readContextOf(chat))
              return {
                ...chat,
                lastTime: timeOf(row.created_at),
                myReadAt: isActive ? row.created_at : chat.myReadAt,
                unread:
                  row.sender_id !== user.id && !isActive && !isMessageExpired(next)
                    ? chat.unread + 1
                    : chat.unread,
                messages: isMessageExpired(next) ? base : [...base, next],
              }
            })
          )

          if (!known) load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              return {
                ...chat,
                messages: chat.messages.flatMap((message) => {
                  if (message.id !== row.id) return [message]
                  const next = mapMessage(row, user.id, readContextOf(chat))
                  return isMessageExpired(next) ? [] : [next]
                }),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const old = payload.old
          if (!old?.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (old.conversation_id && chat.id !== old.conversation_id) return chat
              return {
                ...chat,
                messages: chat.messages.filter((message) => message.id !== old.id),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads' },
        (payload) => {
          const row = payload.new
          if (!row || row.user_id === user.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              const readMap = { ...(chat.readMap || {}), [row.user_id]: row.last_read_at }
              const otherReadAt = Object.entries(readMap)
                .filter(([id]) => id !== user.id)
                .reduce(
                  (max, [, value]) => (!max || value > max ? value : max),
                  null
                )
              return {
                ...chat,
                readMap,
                otherReadAt,
                messages: chat.messages.map((message) =>
                  message.from === 'me'
                    ? {
                        ...message,
                        status: statusFor(
                          message.createdAt,
                          user.id,
                          chat.memberIds || [],
                          chat.isGroup,
                          readMap
                        ),
                      }
                    : message
                ),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return

          if (row.id === user.id) {
            setMe(row)
            return
          }

          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === row.id
                ? {
                    ...contact,
                    name: row.name,
                    username: row.username ?? contact.username,
                    avatarColor: row.avatar_color || contact.avatarColor,
                    avatarUrl: row.avatar_url || null,
                    bio: row.bio || '',
                  }
                : contact
            )
          )
          setChats((prev) =>
            prev.map((chat) => {
              if (!chat.memberIds.includes(row.id)) return chat
              if (chat.isGroup) {
                return {
                  ...chat,
                  members: (chat.members || []).map((member) =>
                    member.id === row.id
                      ? {
                          ...member,
                          name: row.name,
                          username: row.username ?? member.username,
                          avatarColor: row.avatar_color || member.avatarColor,
                          avatarUrl: row.avatar_url || null,
                          bio: row.bio || '',
                        }
                      : member
                  ),
                }
              }
              return {
                ...chat,
                name: row.name,
                avatarColor: row.avatar_color || chat.avatarColor,
                avatarUrl: row.avatar_url || null,
                bio: row.bio || '',
                lastSeen: row.last_seen,
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members' },
        (payload) => {
          const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
          if (!conversationId) return
          if (
            payload.new?.user_id !== user.id &&
            !chatsRef.current.some((chat) => chat.id === conversationId)
          )
            return
          load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === row.id
                ? {
                    ...chat,
                    name: row.title || chat.name,
                    createdBy: row.created_by || chat.createdBy,
                    isGroup: row.is_group ?? chat.isGroup,
                    disappearingTimer: normalizeTimer(
                      row.disappearing_timer ?? chat.disappearingTimer
                    ),
                  }
                : chat
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        (payload) => {
          const id = payload.old?.id
          if (!id) return
          setChats((prev) => prev.filter((chat) => chat.id !== id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const sendMessage = useCallback(
    async (conversationId, text, imageUrl = null, options = {}) => {
      if (!user || !conversationId) return { error: new Error('Not ready') }

      const row = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: text || '',
        image_url: imageUrl || null,
      }
      if (options.replyTo) row.reply_to = options.replyTo
      if (options.forwarded) row.forwarded = true
      if (options.fileUrl) {
        row.file_url = options.fileUrl
        row.file_name = options.fileName || 'Attachment'
        row.file_type = options.fileType || null
        row.file_size = options.fileSize || null
      }
      if (options.timer === '24h') {
        row.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
      if (options.timer === 'view_once') row.view_once = true

      const unique = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
      const tempId = `temp-${unique}`
      const optimisticRow = {
        ...row,
        id: tempId,
        created_at: new Date().toISOString(),
        reactions: {},
        viewed_by: {},
      }
      const optimisticChat = chatsRef.current.find((chat) => chat.id === conversationId) || {}
      const optimistic = {
        ...mapMessage(optimisticRow, user.id, readContextOf(optimisticChat)),
        pending: true,
      }
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === conversationId
            ? {
                ...chat,
                lastTime: timeOf(optimisticRow.created_at),
                messages: [...chat.messages, optimistic],
              }
            : chat
        )
      )

      const withoutTimerColumns = (source) => {
        const next = { ...source }
        delete next.expires_at
        delete next.view_once
        return next
      }
      const legacyRow = withoutTimerColumns(row)

      const fullColumns =
        'id, conversation_id, sender_id, content, image_url, reply_to, reactions, forwarded, created_at, edited_at, deleted_for_all, file_url, file_name, file_type, file_size, expires_at, view_once, viewed_by'
      const fileColumns =
        'id, conversation_id, sender_id, content, image_url, reply_to, reactions, forwarded, created_at, edited_at, deleted_for_all, file_url, file_name, file_type, file_size'
      const midColumns =
        'id, conversation_id, sender_id, content, image_url, reply_to, reactions, forwarded, created_at'
      const baseColumns = 'id, conversation_id, sender_id, content, image_url, created_at'

      let data = null
      let error = null

      const attempt = await supabase.from('messages').insert(row).select(fullColumns).single()
      data = attempt.data
      error = attempt.error

      if (error && options.fileUrl) {
        const retry = await supabase.from('messages').insert(legacyRow).select(fileColumns).single()
        data = retry.data
        error = retry.error
      }

      if (error && !options.fileUrl) {
        // schema8 not applied — retry without the new columns
        const retry = await supabase.from('messages').insert(legacyRow).select(midColumns).single()
        data = retry.data
        error = retry.error
      }

      if (error && !options.fileUrl) {
        // schema6 not applied — retry with base columns only
        const legacy = {
          conversation_id: conversationId,
          sender_id: user.id,
          content: text || '',
          image_url: imageUrl || null,
        }
        const retry = await supabase
          .from('messages')
          .insert(legacy)
          .select(baseColumns)
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === conversationId
              ? { ...chat, messages: chat.messages.filter((message) => message.id !== tempId) }
              : chat
          )
        )
        return { error }
      }

      if (data) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== conversationId) return chat
            const messages = chat.messages.filter((message) => message.id !== tempId)
            const next = mapMessage(data, user.id, readContextOf(chat))
            if (isMessageExpired(next) || messages.some((message) => message.id === data.id)) {
              return { ...chat, messages }
            }
            return {
              ...chat,
              lastTime: timeOf(data.created_at),
              messages: [...messages, next],
            }
          })
        )
      }

      return { data }
    },
    [user]
  )

  const reactToMessage = useCallback(
    async (conversationId, messageId, emoji) => {
      if (!user || !conversationId || !messageId) return false

      const target = chats
        .find((chat) => chat.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      const raw = { ...(target?.reactionsRaw || {}) }
      if (raw[user.id] === emoji) delete raw[user.id]
      else raw[user.id] = emoji

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    reactionsRaw: raw,
                    reaction: raw[user.id] ?? null,
                    reactionList: groupReactions(raw),
                  }
                : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({ reactions: raw })
        .eq('id', messageId)
      return !error
    },
    [chats, user]
  )

  const editMessage = useCallback(
    async (conversationId, messageId, text) => {
      if (!user || !conversationId || !messageId) return false
      const next = text.trim()
      if (!next) return false

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId ? { ...message, text: next, edited: true } : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({ content: next, edited_at: new Date().toISOString() })
        .eq('id', messageId)
      return !error
    },
    [user]
  )

  const deleteMessage = useCallback(
    async (conversationId, messageId, forEveryone) => {
      if (!user || !conversationId || !messageId) return false

      if (!forEveryone) {
        writeHidden(user.id, messageId)
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === conversationId
              ? {
                  ...chat,
                  messages: chat.messages.filter((message) => message.id !== messageId),
                }
              : chat
          )
        )
        return true
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    text: '',
                    imageUrl: null,
                    fileUrl: null,
                    fileName: null,
                    fileType: null,
                    fileSize: null,
                    deleted: true,
                    edited: false,
                    reaction: null,
                    reactionList: [],
                    reactionsRaw: {},
                  }
                : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({
          deleted_for_all: true,
          content: '',
          image_url: null,
          file_url: null,
          file_name: null,
          file_type: null,
          file_size: null,
          reactions: {},
        })
        .eq('id', messageId)
      return !error
    },
    [user]
  )

  const markRead = useCallback(
    async (conversationId) => {
      if (!user || !conversationId) return
      const now = new Date().toISOString()

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === conversationId ? { ...chat, unread: 0, myReadAt: now } : chat
        )
      )

      const { data: viewOnceRows, error: viewError } = await supabase
        .from('messages')
        .select('id, viewed_by')
        .eq('conversation_id', conversationId)
        .eq('view_once', true)
        .neq('sender_id', user.id)
        .is('expires_at', null)

      if (!viewError && viewOnceRows?.length) {
        const ids = viewOnceRows.map((row) => row.id)
        await Promise.all(
          viewOnceRows.map((row) =>
            supabase
              .from('messages')
              .update({
                expires_at: now,
                viewed_by: { ...(row.viewed_by || {}), [user.id]: now },
                content: '',
                image_url: null,
                file_url: null,
                file_name: null,
                file_type: null,
                file_size: null,
              })
              .eq('id', row.id)
          )
        )
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === conversationId
              ? { ...chat, messages: chat.messages.filter((message) => !ids.includes(message.id)) }
              : chat
          )
        )
      }

      if (readReceiptsEnabled()) {
        await supabase.from('conversation_reads').upsert(
          { conversation_id: conversationId, user_id: user.id, last_read_at: now },
          { onConflict: 'conversation_id,user_id' }
        )
      }
    },
    [user]
  )

  const markUnread = useCallback((conversationId) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === conversationId
          ? { ...chat, unread: Math.max(1, chat.unread), myReadAt: null }
          : chat
      )
    )
  }, [])

  const clearChat = useCallback(
    (conversationId) => {
      if (!user) return
      const chat = chatsRef.current.find((item) => item.id === conversationId)
      if (!chat) return
      chat.messages.forEach((message) => writeHidden(user.id, message.id))
      setChats((prev) =>
        prev.map((item) =>
          item.id === conversationId ? { ...item, messages: [], lastTime: '' } : item
        )
      )
    },
    [user]
  )

  const startChat = useCallback(
    async (otherId) => {
      if (!user) return null

      const { data, error } = await supabase.rpc('start_direct_chat', { other_id: otherId })
      if (error) return null

      await load()
      return data
    },
    [load, user]
  )

  const startGroupChat = useCallback(
    async (name, memberIds = []) => {
      if (!user) return null
      const title = String(name || '').trim()
      const ids = [...new Set(memberIds.filter((id) => id && id !== user.id))]
      if (!title || !ids.length) return null

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ is_group: true, title, created_by: user.id })
        .select('id')
        .single()
      if (conversationError || !conversation?.id) return null

      const rows = [
        { conversation_id: conversation.id, user_id: user.id },
        ...ids.map((id) => ({ conversation_id: conversation.id, user_id: id })),
      ]
      const { error: memberError } = await supabase.from('conversation_members').insert(rows)
      if (memberError) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id)
          .eq('created_by', user.id)
        return null
      }

      await load()
      return conversation.id
    },
    [load, user]
  )

  const addGroupMember = useCallback(
    async (conversationId, memberId) => {
      if (!user || !conversationId || !memberId || memberId === user.id) return false
      const { error } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, user_id: memberId })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const removeGroupMember = useCallback(
    async (conversationId, memberId) => {
      if (!user || !conversationId || !memberId) return false
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', memberId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const renameGroup = useCallback(
    async (conversationId, name) => {
      if (!user || !conversationId) return false
      const title = String(name || '').trim()
      if (!title || title.length > 60) return false
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const transferGroupAdmin = useCallback(
    async (conversationId, newAdminId) => {
      if (!user || !conversationId || !newAdminId || newAdminId === user.id) return false
      const { error } = await supabase
        .from('conversations')
        .update({ created_by: newAdminId })
        .eq('id', conversationId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const deleteGroup = useCallback(
    async (conversationId) => {
      if (!user || !conversationId) return false
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId)
      if (error) return false
      setChats((prev) => prev.filter((chat) => chat.id !== conversationId))
      return true
    },
    [user]
  )

  const setDisappearingTimer = useCallback(
    async (conversationId, timer) => {
      if (!user || !conversationId) return false
      const value = normalizeTimer(timer)
      const { error } = await supabase.rpc('set_disappearing_timer', {
        p_conversation: conversationId,
        p_timer: value,
      })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  return {
    chats,
    contacts,
    me,
    loading,
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
    reload: load,
  }
}


