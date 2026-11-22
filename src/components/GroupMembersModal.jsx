import { Check, Crown, LogOut, Pencil, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import Avatar from '@/components/Avatar'

export default function GroupMembersModal({
  chat,
  contacts,
  currentUserId,
  isAdmin = false,
  onClose,
  onAdd,
  onRemove,
  onRename,
  onTransfer,
  onDelete,
  onLeave,
}) {
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [pendingTransferId, setPendingTransferId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const members = chat.members || []
  const memberIds = chat.memberIds ?? members.map((member) => member.id)
  const term = query.trim().toLowerCase().replace(/^@/, '')
  const available = term
    ? contacts.filter(
        (contact) =>
          !memberIds.includes(contact.id) &&
          (contact.username || '').toLowerCase().includes(term)
      )
    : []

  const run = async (id, action) => {
    if (busyId) return
    setBusyId(id)
    await action(id)
    setBusyId(null)
  }

  const saveRename = async () => {
    if (!newName.trim() || busyId) return
    setBusyId('rename')
    const ok = await onRename?.(newName.trim())
    setBusyId(null)
    if (ok) setRenaming(false)
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[95] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Group members"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
              <Users size={16} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight">Group members</h3>
              <p className="truncate text-[10.5px] text-wa-muted">{chat.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {isAdmin && (
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  maxLength={60}
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveRename()
                    if (event.key === 'Escape') setRenaming(false)
                  }}
                  placeholder="Group name"
                  className="min-w-0 flex-1 rounded-xl border border-wa-green/40 bg-white/[0.04] px-3 py-2 text-[12.5px] outline-none"
                />
                <button
                  type="button"
                  onClick={saveRename}
                  disabled={Boolean(busyId) || !newName.trim()}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-wa-green text-white disabled:opacity-40"
                  aria-label="Save group name"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="icon-btn"
                  aria-label="Cancel rename"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNewName(chat.name)
                  setRenaming(true)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12px] text-wa-text transition-colors hover:bg-white/[0.05]"
              >
                <Pencil size={14} className="text-wa-green" />
                Rename group
              </button>
            )}
          </div>
        )}

        <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2">
              <Search size={15} className="shrink-0 text-wa-muted" />
              <input
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Add by username"
                className="w-full bg-transparent py-0.5 text-[12.5px] outline-none placeholder:text-wa-muted"
              />
            </div>
            <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
              {available.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-wa-muted">
                  {term ? 'No account found with that username.' : 'Search by username to add people.'}
                </p>
              ) : (
                available.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => run(contact.id, onAdd)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    <Avatar
                      name={contact.name}
                      color={contact.avatarColor}
                      src={contact.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{contact.name}</span>
                    <UserPlus size={15} className="shrink-0 text-wa-green" />
                  </button>
                ))
              )}
            </div>
          </div>

        <div className="p-2">
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
            {members.length} members
          </p>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <div className="relative">
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  src={member.avatarUrl}
                  size="sm"
                />
                {member.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-wa-panel bg-accent-2" />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">{member.name}</span>
                <span className="block text-[10px] text-wa-muted">
                  {chat.createdBy === member.id
                    ? 'Group admin'
                    : member.online
                      ? 'online'
                      : 'member'}
                </span>
              </span>
              {member.id !== currentUserId && (
                <>
                  {isAdmin && (pendingTransferId === member.id ? (
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() =>
                        run(member.id, async (id) => {
                          const ok = await onTransfer?.(id)
                          if (ok) setPendingTransferId(null)
                        })
                      }
                      className="rounded-lg bg-wa-green/15 px-2 py-1 text-[10px] font-semibold text-wa-green disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => setPendingTransferId(member.id)}
                      className="icon-btn text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                      aria-label={`Make ${member.name} admin`}
                      title="Transfer admin"
                    >
                      <Crown size={15} />
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => run(member.id, onRemove)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {isAdmin ? (
          <div className="border-t border-white/[0.07] p-3">
            {confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => run('delete', async () => { await onDelete?.() })}
                  className="flex-1 rounded-xl bg-red-500/20 py-2.5 text-[12px] font-semibold text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-[12px] text-wa-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 py-2.5 text-[12.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              >
                <Trash2 size={15} />
                Delete group
              </button>
            )}
            <p className="mt-2 text-center text-[10px] text-wa-muted">
              Transfer admin rights before leaving the group.
            </p>
          </div>
        ) : (
          <div className="border-t border-white/[0.07] p-3">
            {confirmLeave ? (
              <div className="animate-pop-in rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300">
                    <LogOut size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-wa-text">Leave this group?</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-wa-muted">
                      You won't be able to send or receive messages in{' '}
                      <span className="font-medium text-wa-text">{chat.name}</span> unless you're
                      added back.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-[12px] font-medium text-wa-muted transition-colors hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() =>
                      run('leave', async () => {
                        await onLeave?.()
                        setConfirmLeave(false)
                      })
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/20 py-2.5 text-[12px] font-semibold text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    Leave group
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmLeave(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 py-2.5 text-[12.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              >
                <LogOut size={15} />
                Leave group
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
