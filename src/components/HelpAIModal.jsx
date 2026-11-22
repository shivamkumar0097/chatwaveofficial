import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Sparkles, X } from 'lucide-react'

const KNOWLEDGE = [
  {
    keys: ['text', 'message bhej', 'send', 'emoji', 'attachment', 'photo', 'file', 'voice note', 'record'],
    answer:
      'Message bhejne ke liye composer me type karke Send. Emoji picker, 📎 se photo/file upload, aur mic se voice note record kar sakte ho. Voice note par play karo — swipe reply bhi kaam karta hai.',
  },
  {
    keys: ['reply', 'swipe', 'quote'],
    answer:
      'Kisi message pe long-press (ya right-swipe) → Reply. Reply quote message ke upar dikhta hai. Swipe direction aapke side ke hisaab se hoti hai.',
  },
  {
    keys: ['edit', 'badlo', 'change text'],
    answer:
      'Apne bheje hue text message ko long-press → Edit message. Edit hone par message ke paas "edited" label dikhta hai. Sirf apne messages edit ho sakte hain.',
  },
  {
    keys: ['delete', 'remove message', 'for everyone', 'for me'],
    answer:
      'Long-press → Delete message. Do options: "Delete for me" (sirf aapke liye) aur "Delete for everyone" (saab ke liye). Multi-select se kai messages ek saath delete bhi kar sakte ho.',
  },
  {
    keys: ['copy', 'clipboard'],
    answer:
      'Text message pe long-press → Copy text. Message copy ho kar clipboard me chala jata hai.',
  },
  {
    keys: ['forward', 'bulk forward'],
    answer:
      'Long-press → Forward → contact ya group chuno. Kai messages ko select karke bulk forward bhi kar sakte ho — ForwardModal me "N messages" dikhega aur sab ek saath bheje jayenge.',
  },
  {
    keys: ['reaction', 'heart', 'double', 'tap', 'love', 'emoji reaction'],
    answer:
      'Double-tap kisi message pe → ❤️ reaction automatically lagti hai (desktop par double-click). Long-press me 6 reactions (❤️ 😂 😮 😢 🙏 👍) ka picker bhi hai. Reaction burst animation bhi dikhti hai.',
  },
  {
    keys: ['star', 'starred', 'save message'],
    answer:
      'Long-press → Star message. Starred messages ⋮ menu → Starred messages me milte hain. "Remove from starred" se hata sakte ho.',
  },
  {
    keys: ['pin message', 'pinned bar', 'upar dikhe'],
    answer:
      'Message pe long-press → Pin message. Pin karte hi chat ke upar (header ke niche) pinned bar ban jata hai. Uspe tap → us message par scroll; X → unpin. Har chat me max 5 pinned messages.',
  },
  {
    keys: ['multi', 'select', 'bulk', 'kai messages'],
    answer:
      'Long-press → Select messages. Phir dusre messages tap karke select karo (check icon dikhega). Upar selection bar me "N selected" ke saath Forward aur Delete buttons hote hain. X se cancel.',
  },
  {
    keys: ['search', 'find message', 'dhundho'],
    answer:
      '⋮ menu → Search messages, ya header me search icon. Likhte hi results aur count dikhte hain. Kisi result pe tap → us message par jump + highlight.',
  },
  {
    keys: ['info', 'message info', 'time', 'seen'],
    answer:
      'Long-press → Message info me message ka time, status (sent/delivered/read) aur details dikhte hain. Bubble ke niche status icons (✓ / ✓✓) bhi hote hain.',
  },
  {
    keys: ['export', 'download chat', 'backup'],
    answer:
      '⋮ menu → Export chat. Us chat ka text transcript .txt file me download ho jata hai (media nahi).',
  },
  {
    keys: ['disappear', 'timer', 'view once', 'expire'],
    answer:
      '⋮ → Disappearing messages me timer chuno (Off ya 24h/7d jaise options). View-once media ek baar dekhne ke baad expire ho jata hai. Bubble par clock icon iski nishani hai.',
  },
  {
    keys: ['new chat', 'start chat', 'contacts'],
    answer:
      'Sidebar ke upar ✉️/New chat button ya menu → New chat. Contact search karke ya QR scan karke naya chat start kar sakte ho. Contacts list saare registered users ki hoti hai.',
  },
  {
    keys: ['new group', 'group banao', 'create group'],
    answer:
      'Sidebar me New group (👥) → group ka naam likho → members select karo → Create. Group banate hi wo open ho jata hai. Kam se kam ek member chunna zaroori hai.',
  },
  {
    keys: ['group members', 'add member', 'remove member', 'admin', 'transfer', 'leave group', 'delete group'],
    answer:
      'Group → ⋮ → Group members. Yahan se username search karke member add, Remove button se hata, crown se admin transfer, Delete group se delete, aur Leave group se confirmation ke baad group chhod sakte ho. Add/Remove sirf group creator (admin) ke liye available hai; non-admin khud leave kar sakta hai.',
  },
  {
    keys: ['header', 'name click', 'photo click', 'contact info', 'group info'],
    answer:
      'Chat header me naam/photo pe click: personal chat me View contact panel, group me Group members modal khulta hai. Home list me photo pe click → Chat, Call, Video, Info wali actions sheet.',
  },
  {
    keys: ['pin chat', 'unpin chat', 'favourite', 'favorites'],
    answer:
      'Chat list me long-press → Pin chat. Pinned chats upar aate hain aur sidebar me "Favorites" tab me dikhte hain. Unpin karne par wapas normal list me.',
  },
  {
    keys: ['archive', 'unarchive'],
    answer:
      'Long-press ya ⋮ → Archive chat. Archived chats sidebar ke "Archived" section me (Back to chats se wapas). Unarchive se wapas normal list me.',
  },
  {
    keys: ['mute', 'unmute', 'notification off', '8 hours', '1 week'],
    answer:
      'Chat ke ⋮ → Mute notifications me 8 hours, 1 week ya Always (forever) chuno. Muted chat ke paas bell-off icon dikhta hai. Sidebar menu se poori app ki notification sound bhi mute kar sakte ho.',
  },
  {
    keys: ['mark read', 'mark unread', 'unread'],
    answer:
      'Chat list me long-press → Mark as read / Mark as unread. Sidebar me "Unread" tab sirf unread chats dikhati hai. Unread count chat list me green badge me hota hai.',
  },
  {
    keys: ['block', 'unblock', 'copy username', 'view profile'],
    answer:
      'Chat list me long-press → View profile / Block contact / Copy username. Block karne par uski messages aur calls band ho jate hain. Settings/profile card se Unblock bhi kar sakte ho. Group chats me ye options nahi dikhte (kyunki group me kai members hote hain).',
  },
  {
    keys: ['clear chat'],
    answer:
      'Chat list me long-press → Clear chat. Ye sirf aapke device se messages chhupata hai (confirmation ke saath), doosre user ki copy par asar nahi karta.',
  },
  {
    keys: ['sidebar', 'tabs', 'filters', 'all', 'groups tab'],
    answer:
      'Sidebar me search box ke niche tabs: All, Unread, Favorites (pinned chats), Groups. Neeche Archived section bhi hai. Upar New chat, New group, QR scan aur ⋮ menu (Profile, Mute notifications, Settings, Log out) hai.',
  },
  {
    keys: ['qr', 'scan', 'qr code', 'add by qr'],
    answer:
      'Sidebar me QR icon se scanner kholo — doosre ka QR scan karte hi chat start. Apna QR dikhane ke liye Profile → QR code ya Settings → Show my QR code. QR me username hota hai.',
  },
  {
    keys: ['voice call', 'audio call', 'call karo'],
    answer:
      'Personal chat ke header me Phone icon se voice call. Call screen me Mute, Screen share aur End buttons niche hote hain. Block hone par call nahi hoti.',
  },
  {
    keys: ['video call', 'camera call'],
    answer:
      'Header me Video icon se video call. Badi video, chhoti self-view, aur niche dock: Mute, Camera (switch), Filters, Share, End. Camera access denied hone par notice aata hai.',
  },
  {
    keys: ['incoming', 'ringing', 'answer', 'decline', 'ringtone'],
    answer:
      'Incoming call par poori screen ringtone + avatar ke saath ripple/floating animation dikhti hai. Answer (green) ya Decline (red) dabao. Screen wake-lock bhi on hoti hai taaki call ke time screen band na ho.',
  },
  {
    keys: ['call controls', 'mute', 'camera switch', 'end call'],
    answer:
      'Call ke niche ek dock hai: Mic/MicOff (mute), Switch camera (video), ✨ Filters (video), Screen share, aur red End. Sab icons ke saath labels likhe hote hain.',
  },
  {
    keys: ['screen share', 'share screen', 'display'],
    answer:
      'Dock me Share dabao → browser screen picker → screen share start. Voice aur video dono calls me kaam karta hai. "Stop share" se band. Share ke time video mirror nahi hota aur filter band rehta hai. Browser support required.',
  },
  {
    keys: ['filter', 'fun filter', 'glow', 'retro', 'neon', 'noir', 'dreamy', 'mono'],
    answer:
      'Video call me dock ka ✨ Filters se 7 filters: Original, Glow, Retro, Mono, Dreamy, Neon, Noir. Filter aapko aur doosre ko bhi dikhta hai (signal se sync). Screen share par auto band ho jata hai.',
  },
  {
    keys: ['minimize', 'call notification', 'back during call', 'restore call', 'ongoing'],
    answer:
      'Call ke time Back dabao ya upar "Minimize" → call chhoti top banner + persistent system notification me chali jati hai. Audio/video chalta rehta hai. Banner/notification pe tap karke wapas full call screen. Call khatam hone par notification apne aap hat jati hai.',
  },
  {
    keys: ['missed call', 'callback', 'no answer', 'call history'],
    answer:
      'Missed call par notification me "Call back" aur "Message" actions hote hain. Calls tab me history dikhti hai — usse call remove bhi kar sakte ho. 45 sec tak answer na mile to "No answer" notification aata hai.',
  },
  {
    keys: ['status', 'story', 'status add'],
    answer:
      'Bottom tab "Status" me text status ya image status add karo. Statuses list me dekhe ja sakte hain, view count dikhta hai, aur apna status hata bhi sakte ho.',
  },
  {
    keys: ['community', 'communities'],
    answer:
      'Bottom tab "Community" aapke groups dikhati hai. Group pe tap karke us chat me khul jate ho, ya Create se naya group bana sakte ho.',
  },
  {
    keys: ['calls tab', 'history'],
    answer:
      'Bottom tab "Calls" me call history (incoming/outgoing/missed, duration) dikhti hai. Har entry ko long-press/right-click se remove, aur "Start a call" se contact ko call kar sakte ho.',
  },
  {
    keys: ['profile', 'edit profile', 'name', 'username', 'avatar', 'bio', 'color'],
    answer:
      'Profile tab (Sidebar menu → Profile) me Edit profile se naam, username, profile photo, avatar color aur bio badal sakte ho. Username 3-20 characters ka hona chahiye (letters, numbers, . ya _). Save sirf tabahi ke baad hi band hota hai.',
  },
  {
    keys: ['settings', 'preferences', 'toggle'],
    answer:
      'Settings tab me ye sab hai: Show my QR code, Screen lock (mobile), Light theme, Push notifications, Notification sounds, Desktop notifications, Read receipts, Haptic feedback, Reduce motion, aur Help & AI. Sab preferences is device par auto save hote hain.',
  },
  {
    keys: ['screen lock', 'app lock', 'pin', 'lock'],
    answer:
      'Settings → Screen lock (sirf mobile me dikhta hai). 4-digit PIN set karo; app kholne par PIN maangta hai. Forgot PIN option se reset kar sakte ho. Ye UI-level lock hai.',
  },
  {
    keys: ['theme', 'light', 'dark'],
    answer:
      'Settings → Light theme toggle se dark/light appearance badalti hai. Default dark hai. Reduce motion toggle animations chhota kar deta hai.',
  },
  {
    keys: ['push notification', 'desktop notification', 'sound', 'read receipts', 'haptics'],
    answer:
      'Settings me: Push notifications (app band ho to bhi alerts — installed PWA + permission chahiye), Notification sounds (message sound on/off), Desktop notifications (tab background me browser alert), Read receipts (doosre ko pata chale aapne padha), Haptic feedback (swipe/long-press par vibration).',
  },
  {
    keys: ['help', 'ai', 'bot', 'features', 'sab', 'poora', 'pura', 'ek ek', 'list'],
    answer:
      'Main ChatWave AI hoon — free help bot. Mujhe app ki har feature aur har setting pata hai. Neeche "Sab features" chip dabao ya koi bhi topic likho: groups, calls, wallpaper, filters, pinned messages, multi-select, settings…',
  },
  {
    keys: ['install', 'pwa', 'home screen'],
    answer:
      'Install prompt (ya browser menu → Install app / Add to Home screen) se ChatWave ko phone me app ki tarah install kar sakte ho. Push notifications ke liye installed app best hai.',
  },
  {
    keys: ['login', 'signup', 'sign in', 'sign up', 'account', 'username check'],
    answer:
      'Pehle sign up ( naam, email, password, username) ya sign in. Username unique hona chahiye. Stepped signup screen me details step-by-step bhare jate hain. Sign out Sidebar menu se.',
  },
]

const ALL_FEATURES = `ChatWave me ye sab hai (ek-ek karke poochho):

• Messages: text, emoji, photo/file, voice note, reply, edit, delete (for me/everyone), copy, forward, reactions, double-tap ❤️, star, pin, multi-select, search, message info, export chat.
• Chats: new chat, new group, QR scan, pin/archive/mute, mark read/unread, block, clear chat, tabs (All/Unread/Favorites/Groups/Archived).
• Groups: members add/remove, admin transfer, delete/leave group, group members list.
• Calls: voice, video, incoming animation, mute, camera switch, fun filters, screen share, minimize + notification, history, missed calls.
• Tabs: Chats, Status, Community, Calls.
• Profile & Settings: name/username/avatar/color/bio, QR code, screen lock, light theme, push, sounds, desktop notifications, read receipts, haptics, reduce motion, Help & AI.
• Extra: disappearing messages aur view-once media.`

const QUICK = [
  'Sab features',
  'Settings',
  'Profile',
  'Groups',
  'Calls',
  'Wallpaper',
  'Pinned',
  'Multi-select',
]

const replyFor = (text) => {
  const query = ` ${text.toLowerCase()} `
  if (/\b(sab|all|poora|pura|features|ek ek|list|saare)\b/.test(query)) return ALL_FEATURES
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
  return `Iske baare me mujhe exact nahi pata, par ye topics main jaanta hoon: ${KNOWLEDGE.map(
    (item) => item.keys[0]
  )
    .slice(0, 10)
    .join(', ')}… "Sab features" likho to poori list de dunga.`
}

export default function HelpAIModal({ onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: "Namaste! Main ChatWave AI hoon 👋 Mujhe is app ki har feature aur har setting pata hai. Kuch bhi poocho — ya niche 'Sab features' dabao.",
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
