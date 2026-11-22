import { Search, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'

export default function NewChatModal({ contacts, onClose, onPick }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const term = query.trim().toLowerCase().replace(/^@/, '')
  const filtered = term
    ? contacts.filter((contact) => (contact.username || '').toLowerCase().includes(term))
    : []

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 backdrop-blur-md sm:pt-24">
      <div className="animate-pop-in w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f1220]/95 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute" />
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
              <UserPlus size={16} />
            </span>
            <div>
              <h2 className="text-[13.5px] font-semibold">New conversation</h2>
              <p className="text-[10.5px] text-wa-muted">Find people by username</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="px-4 pt-3">
          <div className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition-all focus-within:border-wa-green/50 focus-within:shadow-[0_0_0_4px_rgba(124,92,255,0.12)]">
            <Search size={16} className="shrink-0 text-wa-muted" />
            <input
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username"
              className="w-full bg-transparent py-0.5 text-[13.5px] outline-none placeholder:text-wa-muted"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] leading-relaxed text-wa-muted">
              {term
                ? 'No account found with that username.'
                : 'Search by username to find someone to chat with.'}
            </p>
          ) : (
            filtered.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onPick(contact.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-all hover:border-white/[0.06] hover:bg-white/[0.04]"
              >
                <Avatar
                  name={contact.name}
                  color={contact.avatarColor}
                  src={contact.avatarUrl}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{contact.name}</span>
                    <span className="block truncate text-[10.5px] text-wa-muted">
                      {contact.username ? `@${contact.username}` : contact.bio || 'Available to chat'}
                    </span>
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-wa-muted">
                  Message
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

