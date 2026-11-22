import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Info, MessageCircle, Phone, Users, Video, X } from 'lucide-react'
import Avatar from '@/components/Avatar'

export default function ContactActionsModal({
  chat,
  isGroup = false,
  onClose,
  onChat,
  onCall,
  onVideo,
  onInfo,
}) {
  const [zoomed, setZoomed] = useState(false)
  const otherId = chat.memberIds?.find((id) => id !== chat.userId)
  const other = chat.members?.find((member) => member.id === otherId)
  const username = other?.username || ''
  const subtitle = isGroup
    ? `${chat.members?.length || chat.memberIds?.length || 0} members`
    : username
      ? `@${username}`
      : chat.online
        ? 'online'
        : 'ChatWave contact'

  const actions = isGroup
    ? [
        { label: 'Chat', icon: MessageCircle, onClick: onChat, primary: true },
        { label: 'Members', icon: Users, onClick: onInfo },
      ]
    : [
        { label: 'Chat', icon: MessageCircle, onClick: onChat, primary: true },
        { label: 'Call', icon: Phone, onClick: onCall },
        { label: 'Video', icon: Video, onClick: onVideo },
        { label: 'Info', icon: Info, onClick: onInfo },
      ]

  const zoomView = zoomed && (
    <div
      className="animate-fade-in fixed inset-0 z-[140] flex flex-col items-center justify-center gap-5 bg-black/95 p-6 backdrop-blur-xl"
      onClick={() => setZoomed(false)}
      role="presentation"
    >
      <button
        type="button"
        onClick={() => setZoomed(false)}
        className="icon-btn absolute right-4 top-4"
        aria-label="Close photo"
      >
        <X size={22} />
      </button>
      <div className="animate-pop-in" onClick={(event) => event.stopPropagation()}>
        <Avatar name={chat.name} color={chat.avatarColor} src={chat.avatarUrl} size="xxl" />
      </div>
      <div className="text-center" onClick={(event) => event.stopPropagation()}>
        <p className="text-[17px] font-semibold text-white">{chat.name}</p>
        <p className="mt-1 text-[12px] text-white/50">Tap outside to close</p>
      </div>
    </div>
  )

  return createPortal(
    <>
      <div
        className="animate-fade-in fixed inset-0 z-[135] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="glass-strong animate-pop-in w-full max-w-sm rounded-t-3xl p-5 pb-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:rounded-3xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={chat.name}
        >
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
              <X size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="mx-auto -mt-2 block rounded-full p-1 transition-transform hover:scale-105 active:scale-95"
            aria-label={`View ${chat.name}'s photo`}
            title="View photo"
          >
            <Avatar
              name={chat.name}
              color={chat.avatarColor}
              src={chat.avatarUrl}
              size="xl"
              online={!isGroup && chat.online}
              ring
            />
          </button>
          <h2 className="mt-3 truncate text-center text-[18px] font-semibold tracking-tight">
            {chat.name}
          </h2>
          <p className="mt-0.5 truncate text-center text-[12px] text-wa-muted">{subtitle}</p>
          {other?.bio && (
            <p className="mx-auto mt-2 max-w-[260px] truncate text-center text-[11.5px] text-wa-muted">
              {other.bio}
            </p>
          )}

          <div
            className="mt-6 grid gap-2 border-t border-white/[0.07] pt-5"
            style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
          >
            {actions.map(({ label, icon: Icon, onClick, primary }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-wa-text transition-colors hover:bg-white/[0.06] active:bg-white/[0.1]"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl transition-colors ${
                    primary
                      ? 'bg-wa-green/20 text-wa-green'
                      : 'border border-white/[0.07] bg-white/[0.04] text-wa-muted'
                  }`}
                >
                  <Icon size={19} />
                </span>
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {zoomView}
    </>,
    document.body
  )
}
