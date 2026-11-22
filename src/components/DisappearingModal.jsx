import { Ban, Check, Clock, EyeOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const OPTIONS = [
  {
    value: 'off',
    label: 'Off',
    description: 'Messages stay until you delete them',
    icon: Ban,
  },
  {
    value: '24h',
    label: '24 hours',
    description: 'Messages disappear 24 hours after sending',
    icon: Clock,
  },
  {
    value: 'view_once',
    label: 'After viewing',
    description: 'A message disappears once it has been seen',
    icon: EyeOff,
  },
]

export default function DisappearingModal({ current = 'off', onSave, onClose }) {
  const [value, setValue] = useState(current)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const save = async () => {
    if (busy) return
    setBusy(true)
    const ok = await onSave(value)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[95] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Disappearing messages"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
              <Clock size={16} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight">Disappearing messages</h3>
              <p className="text-[10.5px] text-wa-muted">Applies to new messages</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-2">
          {OPTIONS.map((option) => {
            const active = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue(option.value)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                  active ? 'bg-wa-green/10' : 'hover:bg-white/[0.05]'
                }`}
              >
                <option.icon size={17} className={active ? 'text-wa-green' : 'text-wa-muted'} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{option.label}</span>
                  <span className="block text-[10.5px] leading-relaxed text-wa-muted">
                    {option.description}
                  </span>
                </span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    active ? 'border-wa-green bg-wa-green text-white' : 'border-white/15'
                  }`}
                >
                  {active && <Check size={12} />}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-[12px] text-wa-muted hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="btn-accent rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
