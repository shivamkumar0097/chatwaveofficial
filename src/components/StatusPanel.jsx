import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import Avatar from '@/components/Avatar'

const BACKGROUNDS = ['#7c5cff', '#22d3ee', '#f472b6', '#f59e0b', '#00a884', '#ef4444']

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function StatusPanel({ groups, myUserId, loading, onAddText, onAddImage, onRemove, onViewed }) {
  const [creating, setCreating] = useState(false)
  const [opened, setOpened] = useState(null)
  const [text, setText] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const mine = groups.find((group) => group.userId === myUserId)
  const others = groups.filter((group) => group.userId !== myUserId)

  const submitText = async () => {
    if (!text.trim() || busy) return
    setError('')
    setBusy(true)
    try {
      const ok = await onAddText(text, background)
      if (ok) {
        setCreating(false)
        setText('')
      } else setError('Could not share status. Run schema17.sql first.')
    } catch (err) {
      setError(err?.message || 'Could not share status. Run schema17.sql first.')
    } finally {
      setBusy(false)
    }
  }

  const pickImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setError('')
    setBusy(true)
    try {
      const ok = await onAddImage(file)
      if (ok) setCreating(false)
      else setError('Could not upload photo. Check storage permissions and schema17.sql.')
    } catch (err) {
      setError(err?.message || 'Could not upload photo. Check storage permissions and schema17.sql.')
    } finally {
      setBusy(false)
    }
  }

  const openGroup = (group, index) => {
    setOpened({ group, index })
    if (group.userId !== myUserId) onViewed(group.items[index].id)
  }

  const current = opened?.group.items[opened.index]

  const move = async (step) => {
    if (!opened) return
    const next = opened.index + step
    if (next < 0 || next >= opened.group.items.length) {
      setOpened(null)
      return
    }
    setOpened({ ...opened, index: next })
    if (opened.group.userId !== myUserId) await onViewed(opened.group.items[next].id)
  }

  const openedRef = useRef(opened)
  useEffect(() => {
    openedRef.current = opened
  }, [opened])

  useEffect(() => {
    if (!opened) return undefined
    const delay = current?.kind === 'image' ? 5000 : 4000
    const timer = window.setTimeout(() => {
      const active = openedRef.current
      if (!active) return
      const next = active.index + 1
      if (next >= active.group.items.length) {
        setOpened(null)
        return
      }
      setOpened({ ...active, index: next })
      if (active.group.userId !== myUserId) onViewed(active.group.items[next].id)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [opened, current?.kind, myUserId, onViewed])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (opened) setOpened(null)
      else if (creating) setCreating(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [opened, creating])

  return (
    <section className="tab-fade flex min-w-0 flex-1 flex-col bg-wa-bg">
      <header className="flex items-center justify-between border-b border-wa-border px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight">Status</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-full border border-wa-green/25 bg-wa-green/10 px-3 py-1.5 text-[11.5px] font-semibold text-wa-green"
        >
          <Plus size={14} />
          New status
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
          My status
        </p>
        <button
          type="button"
          onClick={() => (mine ? openGroup(mine, 0) : setCreating(true))}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/[0.04]"
        >
          <span className="relative grid h-12 w-12 place-items-center rounded-full border border-dashed border-wa-green/40">
            {mine ? (
              <Avatar
                name={mine.name}
                src={mine.avatarUrl}
                color={mine.avatarColor}
                size="md"
              />
            ) : (
              <Plus size={20} className="text-wa-green" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-wa-bg bg-wa-green text-white">
              <Plus size={11} />
            </span>
          </span>
          <span>
            <span className="block text-[13px] font-medium text-wa-text">My status</span>
            <span className="block text-[10.5px] text-wa-muted">
              {mine ? `${mine.items.length} update${mine.items.length > 1 ? 's' : ''}` : 'Tap to add'}
            </span>
          </span>
        </button>

        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
          Recent updates
        </p>
        {loading ? (
          <p className="py-8 text-center text-[12px] text-wa-muted">Loading...</p>
        ) : others.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-wa-muted">
            No status updates from contacts yet.
          </p>
        ) : (
          <div className="space-y-1">
            {others.map((group) => {
              const unseen = group.items.some((item) => !item.viewedBy?.has?.(myUserId))
              return (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => openGroup(group, 0)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/[0.04]"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full p-[2px] ${
                      unseen ? 'ring-gradient' : 'bg-white/15'
                    }`}
                  >
                    <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-wa-panel text-[12px] font-semibold text-wa-text">
                      {group.avatarUrl ? (
                        <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                      ) : (
                        initialsOf(group.name)
                      )}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{group.name}</span>
                    <span className="block text-[10.5px] text-wa-muted">
                      {new Date(group.items[0].createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {creating && (
        <div
          className="animate-fade-in fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setCreating(false)}
          role="presentation"
        >
          <div
            className="glass-strong animate-pop-in w-full max-w-sm rounded-3xl p-5"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-end">
              <button type="button" onClick={() => setCreating(false)} className="icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <h3 className="text-[15px] font-semibold">New status</h3>
            <textarea
              autoFocus
              value={text}
              maxLength={180}
              onChange={(event) => setText(event.target.value)}
              placeholder="Share something..."
              className="input-luxe mt-4 min-h-[100px] resize-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {BACKGROUNDS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBackground(color)}
                  className={`h-7 w-7 rounded-full border-2 ${background === color ? 'border-white' : 'border-white/20'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Background ${color}`}
                />
              ))}
            </div>
            {error && <p className="mt-3 text-[11px] leading-relaxed text-red-300">{error}</p>}
            <div className="mt-5 flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-wa-muted"
                aria-label="Add photo status"
              >
                <ImagePlus size={18} />
              </button>
              <button
                type="button"
                onClick={submitText}
                disabled={!text.trim() || busy}
                className="btn-accent flex-1 rounded-xl text-[12.5px] font-semibold text-white disabled:opacity-40"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {opened && current && (
        <div
          className="animate-fade-in fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpened(null)}
          role="presentation"
        >
          <div
            className="animate-pop-in relative flex h-[70vh] w-full max-w-sm flex-col justify-end overflow-hidden rounded-3xl p-5"
            style={
              current.kind === 'image'
                ? undefined
                : { background: `linear-gradient(160deg, ${current.background}, #0d0f19)` }
            }
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {current.kind === 'image' && (
              <img src={current.imageUrl} alt="Status" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                move(-1)
              }}
              className="absolute inset-y-0 left-0 z-10 w-1/2 bg-transparent"
              aria-label="Previous status"
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                move(1)
              }}
              className="absolute inset-y-0 right-0 z-10 w-1/2 bg-transparent"
              aria-label="Next status"
            />
            <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
              {opened.group.items.map((item, i) => (
                <span
                  key={item.id}
                  className={`h-0.5 flex-1 rounded-full ${i <= opened.index ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
            <div className="relative flex items-end justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-white drop-shadow">
                  {opened.group.userId === myUserId ? 'My status' : opened.group.name}
                </p>
                <p className="text-[11px] text-white/70">
                  {new Date(current.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {opened.group.userId === myUserId && ` · ${current.viewedBy?.size || 0} views`}
                </p>
              </div>
              {opened.group.userId === myUserId && (
                <button
                  type="button"
                  onClick={async () => {
                    await onRemove(current.id)
                    setOpened(null)
                  }}
                  className="icon-btn relative z-20 text-white"
                  aria-label="Delete status"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
            {current.kind === 'text' && (
              <p className="relative mt-4 whitespace-pre-wrap text-[20px] font-medium leading-relaxed text-white">
                {current.text}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              move(-1)
            }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
            aria-label="Previous status"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              move(1)
            }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
            aria-label="Next status"
          >
            ›
          </button>
        </div>
      )}
    </section>
  )
}
