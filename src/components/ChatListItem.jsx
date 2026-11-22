import { useRef } from 'react'
import { CheckCheck, Check, Pin, Users } from 'lucide-react'
import Avatar from '@/components/Avatar'
import EmojiText from '@/components/EmojiText'

export default function ChatListItem({ chat, active, pinned = false, onSelect, onLongPress, onAvatarClick }) {
  const last = chat.messages[chat.messages.length - 1]
  const timerRef = useRef(null)
  const longPressedRef = useRef(false)

  const startPress = (event) => {
    longPressedRef.current = false
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true
      onLongPress?.(chat, event.clientX, event.clientY)
    }, 500)
  }
  const cancelPress = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  return (
    <button
      type="button"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => {
        event.preventDefault()
        onLongPress?.(chat, event.clientX, event.clientY)
      }}
      onClick={() => {
        if (longPressedRef.current) {
          longPressedRef.current = false
          return
        }
        onSelect()
      }}
      className={`group relative flex w-full touch-none select-none items-center gap-3 overflow-hidden rounded-2xl transition-transform duration-200 hover:translate-x-0.5 px-2.5 py-2.5 text-left transition-all duration-200 ${
        active
          ? 'active-chat-glow border border-wa-green/25'
          : 'border border-transparent hover:border-white/[0.06] hover:bg-white/[0.035]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-wa-green to-accent-2" />
      )}

      <span
        aria-label={`Open ${chat.name}'s contact actions`}
        className="shrink-0 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95"
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.stopPropagation()
          onAvatarClick?.(chat)
        }}
      >
        <Avatar
          name={chat.name}
          color={chat.avatarColor}
          src={chat.avatarUrl}
          size="lg"
          online={chat.online}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {chat.isGroup && <Users size={12} className="shrink-0 text-wa-muted" />}
            <span
              className={`truncate text-[15.5px] font-medium ${
                active ? 'text-white' : 'text-wa-text'
              }`}
            >
              {chat.name}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {pinned && <Pin size={11} className="rotate-45 text-wa-muted" />}
            <span
              className={`text-[11px] ${
                chat.unread ? 'font-medium text-wa-green' : 'text-wa-muted'
              }`}
            >
              {chat.lastTime}
            </span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-[13.5px] text-wa-muted">
            {chat.typing ? (
              <span className="flex items-center gap-1 truncate text-accent-2">
                <span className="flex items-end gap-0.5">
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                </span>
                typing...
              </span>
            ) : (
              <>
                {last?.from === 'me' &&
                  (last.status === 'read' ? (
                    <CheckCheck size={14} className="shrink-0 text-accent-2" />
                  ) : (
                    <Check size={14} className="shrink-0 text-wa-muted/70" />
                  ))}
                <span className="truncate">
                  {chat.isGroup && last?.from === 'me' && !last.deleted && (
                    <span className="shrink-0 text-wa-muted">You: </span>
                  )}
                  {last?.deleted
                    ? 'Message deleted'
                    : last?.imageUrl && !last?.text
                      ? 'Photo'
                      : last?.fileUrl && !last?.text
                        ? last.fileName || 'Attachment'
                        : <EmojiText text={last?.text || 'No messages yet'} />}
                </span>
              </>
            )}
          </span>
          {chat.unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-wa-green to-accent-3 px-1.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(124,92,255,0.9)]">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}




