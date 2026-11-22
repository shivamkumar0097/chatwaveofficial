import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Sparkles, X } from 'lucide-react'

const KNOWLEDGE = [
  {
    keys: ['group', 'gr ups', 'member', 'add', 'remove', 'leave', 'admin'],
    answer:
      'Group me member add/remove: group kholo → ⋮ → Group members. Admin hi Add search aur Remove button dekh sakta hai (RLS rules). Khud group chhodne ke liye "Leave group" dabao — pehle confirmation aayega. Admin Transfer (crown) aur Delete group bhi yahin hai.',
  },
  {
    keys: ['wallpaper', 'background', 'photo', 'theme', 'custom'],
    answer:
      'Wallpaper badalne ke liye chat kholo → ⋮ → Chat wallpaper. 10 ready options hain (Dots, Aurora, Ocean, Forest, Sunset, Nebula, Grid, Golden…). "My Photo" se apni image upload kar sakte ho — compress hoke usi chat me save hoti hai. Select karte hi picker band ho jata hai.',
  },
  {
    keys: ['call', 'ringing', 'minimize', 'notification', 'back', 'answer', 'decline'],
    answer:
      'Call/Video call: chat header me Phone ya Video icon. Incoming call pe animation + Answer/Decline. Call ke time Back dabao to call minimize ho kar upar banner/system notification me chali jati hai — uspe tap karke wapas aa sakte ho. Call screen me Mute, Camera, Filters, Share, End sab niche dock me hain.',
  },
  {
    keys: ['screen', 'share', 'display'],
    answer:
      'Screen share: call ke bottom dock me "Share" dabao → browser screen picker aayega → "Stop share" se band. Voice aur video dono calls me chalata hai. Screen mirror nahi hota, text seedha dikhta hai.',
  },
  {
    keys: ['filter', 'fun', 'video effect', 'neon', 'retro'],
    answer:
      'Video call me bottom dock ka "Filters" (✨) kholo — Glow, Retro, Mono, Dreamy, Neon, Noir etc. Filter aapko aur doosre ko bhi dikhta hai. Share karte waqt filter automatically band ho jata hai.',
  },
  {
    keys: ['pin', 'pinned', 'bar'],
    answer:
      'Message pin: kisi message pe long-press → "Pin message". Pin karte hi chat ke upar (header ke niche) pinned bar dikhega. Uspe tap → us message par scroll; X → unpin. Max 5 pinned messages per chat.',
  },
  {
    keys: ['multi', 'select', 'bulk', 'delete many', 'forward many'],
    answer:
      'Kai messages ek saath: long-press → "Select messages", phir dusre messages tap karke select karo. Upar se Forward ya Delete kar sakte ho. Bulk forward bhi properly bheja jata hai.',
  },
  {
    keys: ['reaction', 'heart', 'double', 'tap', 'love'],
    answer:
      'Double-tap kisi message pe → ❤️ reaction automatically lag jati hai (desktop par double-click). Normal long-press me 6 reactions ka picker aur Reply, Forward, Copy, Edit, Star, Pin, Info, Delete milte hain.',
  },
  {
    keys: ['header', 'name', 'click', 'contact', 'profile', 'info'],
    answer:
      'Chat header me naam/photo pe click: personal chat me "View contact" panel, group me "Group members" khulta hai. Home list me photo pe click karne se bhi contact actions sheet (Chat/Call/Video/Info) aati hai.',
  },
  {
    keys: ['star', 'starred', 'favorite'],
    answer:
      'Message star: long-press → "Star message". Starred messages ⋮ → Starred messages me dekhe sakte ho. Chats ko pin/archive/mute bhi ⋮ menu se kar sakte ho; sidebar me Favorites tab bhi hai.',
  },
  {
    keys: ['search', 'find', 'export', 'forward'],
    answer:
      '⋮ menu se "Search messages" se is chat me search. Message ko forward karne ke liye long-press → Forward → contact/group chuno. Chat export bhi ⋮ menu me hai (txt file download).',
  },
  {
    keys: ['status', 'story', 'community', 'calls tab'],
    answer:
      'Bottom tabs: Chats, Status, Community, Calls. Status me text/image status add kar sakte ho; Community groups dikhati hai; Calls tab me call history aur "Start a call" se naya call.',
  },
  {
    keys: ['qr', 'scan', 'block', 'contact add'],
    answer:
      'Naya chat:sidebar ke + se New Chat ya Group. QR scan se username dhund kar chat start. Kisi ko block/unblock: chat list me long-press → Block/Unblock ya contact card se.',
  },
  {
    keys: ['disappear', 'timer', 'view once', 'secret'],
    answer:
      '⋮ → Disappearing messages se timer set karo (Off/24h/7d/etc.). View-once media bhi support hai — ek baar dekhne ke baad expire ho jata hai.',
  },
  {
    keys: ['sound', 'notification', 'desktop', 'push', 'lock', 'theme'],
    answer:
      'Profile/Settings se sound, desktop notifications, push, theme (dark/light), reduce motion aur App Lock set kar sakte ho. App Lock PIN 4-digit hai aur mobile par lock hota hai.',
  },
  {
    keys: ['voice', 'audio', 'record', 'message bhej'],
    answer:
      'Composer me mic/se 📎 se voice note ya attachment bhej sakte ho. Text message bhejne ke liye type karke Send. Reply karne ke liye message pe long-press → Reply (ya swipe).',
  },
  {
    keys: ['ai', 'bot', 'help', 'kya kar', 'features', 'sab'],
    answer:
      'Main ChatWave AI hoon — free help bot. Mujhe app ki saari features pata hain: groups, calls, filters, wallpapers, pinned messages, multi-select, QR, status, settings… niche diye gaye topics pe click karo ya apna sawaal likho.',
  },
]

const QUICK = ['Groups', 'Wallpaper', 'Calls', 'Filters', 'Pinned message', 'Multi-select']

const replyFor = (text) => {
  const query = ` ${text.toLowerCase()} `
  let best = null
  let bestScore = 0
  for (const item of KNOWLEDGE) {
    let score = 0
    for (const key of item.keys) if (query.includes(key)) score += key.includes(' ') ? 3 : 1
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  if (best) return best.answer
  return `Iske baare me mujhe abhi exact nahi pata. Ye topics try karo: ${KNOWLEDGE.map(
    (item) => item.keys[0]
  )
    .slice(0, 8)
    .join(', ')}. Ya apna sawaal thoda aur detail me likho.`
}

export default function HelpAIModal({ onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: "Namaste! Main ChatWave AI hoon 👋 Is app ki koi bhi feature ke baare me poocho — group, call, wallpaper, filters, pinned messages… sab bata sakta hoon.",
    },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ask = (text) => {
    const question = text.trim()
    if (!question) return
    setMessages((prev) => [...prev, { id: `q-${Date.now()}`, from: 'me', text: question }])
    setInput('')
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, from: 'bot', text: replyFor(question) },
      ])
    }, 220)
  }

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[145] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ChatWave AI help"
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold tracking-tight">ChatWave AI</h3>
            <p className="text-[10.5px] text-wa-muted">App ke baare me kuch bhi poocho</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close AI help">
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  message.from === 'me'
                    ? 'rounded-br-md bg-wa-green/20 text-wa-text'
                    : 'rounded-bl-md border border-white/[0.06] bg-white/[0.04] text-wa-text'
                }`}
              >
                {message.text}
              </p>
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                className="rounded-full border border-wa-green/25 bg-wa-green/[0.07] px-2.5 py-1.5 text-[11px] text-wa-green transition-colors hover:bg-wa-green/15"
              >
                {item}
              </button>
            ))}
          </div>
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            ask(input)
          }}
          className="flex items-center gap-2 border-t border-white/[0.07] p-3"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Apna sawaal likho…"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12.5px] outline-none placeholder:text-wa-muted focus:border-wa-green/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wa-green text-white transition-transform hover:scale-105 disabled:opacity-40"
            aria-label="Send question"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
