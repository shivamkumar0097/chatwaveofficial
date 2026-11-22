import { Check, Search, Users, X } from 'lucide-react'
import { useState } from 'react'
import Avatar from '@/components/Avatar'

export default function NewGroupModal({ contacts, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)

  const term = query.trim().toLowerCase().replace(/^@/, '')
  const filtered = term
    ? contacts.filter((contact) => (contact.username || '').toLowerCase().includes(term))
    : []
  const canCreate = Boolean(name.trim()) && selected.length > 0 && !busy

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))

  const submit = async () => {
    if (!canCreate) return
    setBusy(true)
    let created
    try {
      created = await onCreate(name.trim(), selected)
    } catch {
      created = null
    } finally {
      setBusy(false)
    }
    if (created !== null && created !== false) onClose()
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-12 backdrop-blur-md sm:pt-20">
      <div className="animate-pop-in w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f1220]/95 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
              <Users size={16} />
            </span>
            <div>
              <h2 className="text-[13.5px] font-semibold">New group</h2>
              <p className="text-[10.5px] text-wa-muted">Name it, pick your people</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-3 px-4 pt-4">
          <div className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition-all focus-within:border-wa-green/50 focus-within:shadow-[0_0_0_4px_rgba(124,92,255,0.12)]">
            <Users size={16} className="shrink-0 text-wa-muted" />
            <input
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Group name"
              className="w-full bg-transparent py-0.5 text-[13.5px] outline-none placeholder:text-wa-muted"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((id) => {
                const contact = contacts.find((item) => item.id === id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    className="flex items-center gap-1.5 rounded-full border border-wa-green/25 bg-wa-green/10 py-1 pl-1 pr-2 text-[11px] text-wa-text transition-colors hover:bg-wa-green/20"
                  >
                    <Avatar
                      name={contact?.name || '?'}
                      color={contact?.avatarColor}
                      src={contact?.avatarUrl}
                      size="sm"
                    />
                    <span className="max-w-24 truncate">{contact?.name || 'Member'}</span>
                    <X size={11} className="text-wa-muted" />
                  </button>
                )
              })}
            </div>
          )}

          <div className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition-all focus-within:border-wa-green/50 focus-within:shadow-[0_0_0_4px_rgba(124,92,255,0.12)]">
            <Search size={16} className="shrink-0 text-wa-muted" />
            <input
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username"
              className="w-full bg-transparent py-0.5 text-[13.5px] outline-none placeholder:text-wa-muted"
            />
          </div>
        </div>

        <div className="max-h-[42vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-wa-muted">
              {term
                ? 'No account found with that username.'
                : 'Search by username to add people.'}
            </p>
          ) : (
            filtered.map((contact) => {
              const picked = selected.includes(contact.id)
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggle(contact.id)}
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
                      {contact.bio || 'Available to chat'}
                    </span>
                  </span>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      picked
                        ? 'border-wa-green bg-wa-green text-white'
                        : 'border-white/15 text-transparent'
                    }`}
                  >
                    <Check size={13} />
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <span className="text-[11px] text-wa-muted">
            {selected.length ? `${selected.length} selected` : 'Pick at least one person'}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!canCreate}
            className="btn-accent rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Creating...' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  )
}
