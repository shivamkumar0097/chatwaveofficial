import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AtSign, Check, Eye, EyeOff, Loader2, Lock, Mail, Moon, ShieldCheck, Sun, User, Users, X, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import InstallPrompt from '@/components/InstallPrompt'

const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cleanUsername = (value) => value.trim().toLowerCase().replace(/^@/, '')

const STEP_LABELS = ['Account', 'Username', 'Security']

const TERMS = [
  {
    title: 'Be respectful',
    text: 'No harassment, hate speech, spam or illegal content. Accounts violating this can be suspended.',
  },
  {
    title: 'Your account, your responsibility',
    text: 'Keep your password safe. You are responsible for all activity that happens from your account.',
  },
  {
    title: 'Your data',
    text: 'Your messages and profile stay private to you and the people you chat with. We never sell your data.',
  },
  {
    title: 'Fair use',
    text: 'Do not attempt to disrupt, scrape or reverse-engineer the service or access other users\' data.',
  },
  {
    title: 'Age requirement',
    text: 'You must be at least 13 years old (or the minimum age required in your country) to use ChatWave.',
  },
  {
    title: 'Service availability',
    text: 'ChatWave is provided as-is. We work hard to keep it online, but cannot guarantee uninterrupted access.',
  },
]

function TermsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Terms and conditions"
    >
      <div
        className="glass-strong animate-pop-in max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Terms & Conditions</h3>
            <p className="text-[11px] text-wa-muted">Last updated: November 2025</p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-wa-muted transition-colors hover:text-wa-text"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[calc(80vh-4.5rem)] space-y-4 overflow-y-auto px-6 py-5">
          {TERMS.map((term, index) => (
            <div key={term.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[13px] font-medium text-wa-text">
                <span className="mr-1.5 text-wa-green">{String(index + 1).padStart(2, '0')}</span>
                {term.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-wa-muted">{term.text}</p>
            </div>
          ))}
          <p className="pb-1 text-center text-[11px] leading-relaxed text-wa-muted">
            By using ChatWave you agree to these terms. Questions? Reach out to the developer.
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, id, value, onChange, valid = false, action = null, ...inputProps }) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0

  return (
    <div className="group relative">
      <Icon
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-wa-muted transition-colors group-focus-within:text-wa-green"
      />
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        aria-label={label}
        className={`input-luxe pb-1.5 pl-10 pt-5 ${action ? 'pr-11' : valid ? 'pr-10' : ''}`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-10 z-10 text-[13px] transition-all duration-200 ${
          floated ? 'top-[6px] scale-[0.82] text-wa-green/90' : 'top-1/2 -translate-y-1/2 text-wa-muted'
        }`}
      >
        {label}
      </label>
      {valid && !action && (
        <Check size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-wa-green" />
      )}
      {action}
    </div>
  )
}

const features = [
  {
    icon: Zap,
    title: 'Instant delivery',
    text: 'Messages land in real time with typing and presence.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Row-level security keeps every conversation yours.',
  },
  {
    icon: Users,
    title: 'Made for everyone',
    text: 'Clean, fast and comfortable on any screen size.',
  },
]

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isSignup = mode === 'signup'
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [theme, setTheme] = useState(() => window.localStorage.getItem('cw-theme') || 'dark')

  useEffect(() => {
    const handle = cleanUsername(username)
    if (!isSignup || !USERNAME_PATTERN.test(handle)) {
      setUsernameStatus('idle')
      return undefined
    }
    setUsernameStatus('checking')
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (!supabase) {
        setUsernameStatus('available')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', handle)
        .limit(1)
      if (!cancelled) setUsernameStatus(data?.length ? 'taken' : 'available')
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [username, isSignup])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    window.localStorage.setItem('cw-theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  const switchMode = (next) => {
    setMode(next)
    setStep(0)
    setError('')
    setNotice('')
  }

  const tabSwipe = useRef(null)
  const tabRef = useRef(null)
  const tabButtonRefs = useRef([])
  const tabLastSwipe = useRef(0)
  const [tabDragX, setTabDragX] = useState(0)
  const [tabDragging, setTabDragging] = useState(false)
  const [tabSpacing, setTabSpacing] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const [first, second] = tabButtonRefs.current
      if (first && second) setTabSpacing(second.offsetLeft - first.offsetLeft)
    }
    measure()
    const node = tabRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const tabHandlersRef = useRef(null)

  useEffect(() => {
    const node = tabRef.current
    if (!node) return undefined
    let active = false
    let startX = 0
    let startY = 0
    const onStart = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      active = true
      startX = touch.clientX
      startY = touch.clientY
      tabHandlersRef.current.startTabSwipe(touch.clientX, touch.clientY)
    }
    const onMove = (event) => {
      if (!active) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault()
        tabHandlersRef.current.moveTabSwipe(touch.clientX, touch.clientY)
      }
    }
    const onEnd = (event) => {
      if (!active) return
      active = false
      const touch = event.changedTouches[0]
      tabHandlersRef.current.endTabSwipe(touch ? touch.clientX : startX, touch ? touch.clientY : startY)
    }
    const onCancel = () => {
      active = false
      tabHandlersRef.current.cancelTabSwipe()
    }
    node.addEventListener('touchstart', onStart, { passive: true })
    node.addEventListener('touchmove', onMove, { passive: false })
    node.addEventListener('touchend', onEnd)
    node.addEventListener('touchcancel', onCancel)
    return () => {
      node.removeEventListener('touchstart', onStart)
      node.removeEventListener('touchmove', onMove)
      node.removeEventListener('touchend', onEnd)
      node.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  const startTabSwipe = (x, y) => {
    tabSwipe.current = { x, y }
    setTabDragging(true)
  }
  const moveTabSwipe = (x, y) => {
    const start = tabSwipe.current
    if (!start) return
    const dx = x - start.x
    const dy = y - start.y
    if (Math.abs(dx) < Math.abs(dy)) return
    const limit = tabSpacing || (tabRef.current?.getBoundingClientRect().width || 200) / 2 - 8
    const limited = isSignup ? Math.min(0, Math.max(-limit, dx)) : Math.max(0, Math.min(limit, dx))
    setTabDragX(limited)
  }
  const endTabSwipe = (x, y) => {
    const start = tabSwipe.current
    tabSwipe.current = null
    setTabDragging(false)
    setTabDragX(0)
    if (!start) return
    const dx = x - start.x
    const dy = y - start.y
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return
    if (dx > 0 && !isSignup) {
      tabLastSwipe.current = Date.now()
      switchMode('signup')
    } else if (dx < 0 && isSignup) {
      tabLastSwipe.current = Date.now()
      switchMode('signin')
    }
  }
  const cancelTabSwipe = () => {
    tabSwipe.current = null
    setTabDragging(false)
    setTabDragX(0)
  }
  useEffect(() => {
    tabHandlersRef.current = { startTabSwipe, moveTabSwipe, endTabSwipe, cancelTabSwipe }
  })
  const onTabClick = (next) => {
    if (Date.now() - tabLastSwipe.current < 400) return
    switchMode(next)
  }
  const tabSwipeHandlers = {
    onPointerDown: (event) => {
      if (event.pointerType === 'touch') return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      startTabSwipe(event.clientX, event.clientY)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {}
    },
    onPointerMove: (event) => {
      if (event.pointerType === 'touch') return
      moveTabSwipe(event.clientX, event.clientY)
    },
    onPointerUp: (event) => {
      if (event.pointerType === 'touch') return
      endTabSwipe(event.clientX, event.clientY)
    },
    onPointerCancel: (event) => {
      if (event.pointerType !== 'touch') cancelTabSwipe()
    },
  }

  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 6) score += 1
    if (password.length >= 10) score += 1
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
    return score
  })()

  const strengthLabel = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][strength]

  const passwordChecks = [
    { label: '6+ characters', ok: password.length >= 6 },
    { label: 'A number', ok: /\d/.test(password) },
    { label: 'Uppercase + symbol', ok: /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password) },
  ]

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (isSignup && !agreed) {
      setError('Please accept the Terms & Conditions to create an account.')
      return
    }

    const handle = cleanUsername(username)
    if (isSignup && !USERNAME_PATTERN.test(handle)) {
      setError('Username must be 3-20 characters: letters, numbers, . or _ (no spaces).')
      return
    }

    if (isSignup && supabase) {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', handle)
        .limit(1)
      if (taken?.length) {
        setError('That username is already taken.')
        return
      }
    }

    setBusy(true)

    const result = isSignup
      ? await signUp(email.trim(), password, name.trim() || email.split('@')[0], handle)
      : await signIn(email.trim(), password)

    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (isSignup && !result.data.session) {
      setNotice('Account created. Check your email for the confirmation link, then sign in.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (isSignup && step === 0) {
      if (!EMAIL_PATTERN.test(email.trim())) {
        setError('Enter a valid email address to continue.')
        return
      }
      setStep(1)
      return
    }

    if (isSignup && step === 1) {
      const handle = cleanUsername(username)
      if (!USERNAME_PATTERN.test(handle)) {
        setError('Username must be 3-20 characters: letters, numbers, . or _ (no spaces).')
        return
      }
      if (supabase) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', handle)
          .limit(1)
        if (taken?.length) {
          setError('That username is already taken.')
          return
        }
      }
      setStep(2)
      return
    }

    await submit(event)
  }

  const passwordField = (
    <Field
      icon={Lock}
      label="Password"
      id="auth-password"
      name="password"
      type={showPassword ? 'text' : 'password'}
      autoComplete={isSignup ? 'new-password' : 'current-password'}
      required
      minLength={6}
      value={password}
      onChange={setPassword}
      action={
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-wa-muted transition-colors hover:bg-white/[0.06] hover:text-wa-text"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  )

  const emailField = (
    <Field
      icon={Mail}
      label="Email address"
      id="auth-email"
      name="email"
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
      required
      value={email}
      onChange={setEmail}
      valid={EMAIL_PATTERN.test(email.trim())}
    />
  )

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto bg-wa-bg px-4 py-10 sm:px-6 lg:px-10">
      <div className="aurora-blob left-[-8%] top-[-12%] h-80 w-80 bg-[#7c5cff]/50" />
      <div
        className="aurora-blob right-[-6%] top-[18%] h-72 w-72 bg-[#22d3ee]/35"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="aurora-blob bottom-[-14%] left-[35%] h-72 w-80 bg-[#f472b6]/25"
        style={{ animationDelay: '-11s' }}
      />

      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
        <div
          className="animate-float absolute left-[12%] top-[26%] rounded-2xl rounded-bl-sm border border-white/[0.06] bg-white/[0.035] px-4 py-3 text-[12px] text-wa-muted/70 backdrop-blur-sm"
          style={{ animationDelay: '-2s' }}
        >
          Hey, are you there?
        </div>
        <div
          className="animate-float absolute right-[14%] top-[58%] rounded-2xl rounded-br-sm border border-wa-green/15 bg-wa-green/[0.06] px-4 py-3 text-[12px] text-wa-green/70 backdrop-blur-sm"
          style={{ animationDelay: '-7s' }}
        >
          Always here. Let's talk.
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-fade-up hidden flex-col gap-8 lg:flex">
            <div className="flex items-center gap-3">
              <div className="ring-gradient grid h-11 w-11 place-items-center rounded-2xl shadow-[0_10px_30px_-10px_rgba(124,92,255,0.9)]"><img src="/logo.jpg" alt="ChatWave" className="h-6 w-6" /></div>
              <span className="text-lg font-semibold tracking-tight">ChatWave</span>
            </div>

            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-wa-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-2 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
                Real-time messaging
              </span>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
                Conversations that
                <br />
                <span className="gradient-text">flow with you.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-relaxed text-wa-muted">
                Fast, focused and beautifully simple. Chat one to one, see when friends are
                online, and never lose your place again.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-wa-green/40 hover:bg-white/[0.055]"
                >
                  <feature.icon
                    size={19}
                    className="mb-3 text-wa-green transition-transform duration-300 group-hover:scale-110"
                  />
                  <p className="text-[13px] font-medium text-wa-text">{feature.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-wa-muted">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: '80ms' }}>
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <div className="ring-gradient grid h-14 w-14 place-items-center rounded-2xl shadow-[0_12px_34px_-10px_rgba(124,92,255,0.9)]"><img src="/logo.jpg" alt="ChatWave" className="h-8 w-8" /></div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">ChatWave</h1>
                <p className="mt-1 text-sm text-wa-muted">Chats that flow with you.</p>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {['Real-time', 'Private', 'Free'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-wa-muted"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-wa-green/35 via-white/[0.06] to-accent-2/35 p-px shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
              <div className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-7">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-wa-green/60 to-transparent" />

                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="heading-stagger">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {isSignup ? 'Create your account' : 'Welcome back'}
                    </h2>
                    <p className="mt-1 text-[13px] text-wa-muted">
                      {isSignup
                        ? 'Three tiny steps and you are in.'
                        : 'Sign in to pick up where you left off.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-wa-muted transition-colors hover:border-wa-green/30 hover:text-wa-text"
                    aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                    title={theme === 'light' ? 'Dark theme' : 'Light theme'}
                  >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  </button>
                </div>

                <div
                  ref={tabRef}
                  style={{ touchAction: 'none' }}
                  className="relative mb-5 grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-1 text-[13px] select-none"
                >
                  <span
                    className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-white/[0.09] shadow-[0_0_0_1px_rgba(124,92,255,0.22),0_6px_18px_-8px_rgba(124,92,255,0.7)] ${
                      tabDragging ? '' : 'transition-transform duration-300'
                    }`}
                    style={{ transform: `translateX(${isSignup ? tabSpacing : 0}px) translateX(${tabDragX}px)` }}
                  />
                  <button
                    ref={(node) => { tabButtonRefs.current[0] = node }}
                    type="button"
                    {...tabSwipeHandlers}
                    onClick={() => onTabClick('signin')}
                    aria-pressed={!isSignup}
                    className={`relative z-10 touch-none rounded-lg py-2 font-medium transition-colors duration-200 ${
                      !isSignup ? 'text-white' : 'text-wa-muted hover:text-wa-text'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    ref={(node) => { tabButtonRefs.current[1] = node }}
                    type="button"
                    {...tabSwipeHandlers}
                    onClick={() => onTabClick('signup')}
                    aria-pressed={isSignup}
                    className={`relative z-10 touch-none rounded-lg py-2 font-medium transition-colors duration-200 ${
                      isSignup ? 'text-white' : 'text-wa-muted hover:text-wa-text'
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {isSignup && (
                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.14em] text-wa-muted">
                      <span>Step {step + 1} of 3</span>
                      <span>{STEP_LABELS[step]}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {STEP_LABELS.map((label, index) => (
                        <button
                          key={label}
                          type="button"
                          disabled={index > step}
                          onClick={() => index < step && setStep(index)}
                          aria-label={`Go to ${label} step`}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            index <= step
                              ? 'bg-gradient-to-r from-wa-green to-accent-2'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="form-stagger flex flex-col gap-3.5">
                  {(!isSignup || step === 0) && (
                    <>
                      {isSignup && (
                        <Field
                          icon={User}
                          label="Your name"
                          id="auth-name"
                          name="name"
                          autoComplete="name"
                          value={name}
                          onChange={setName}
                          valid={name.trim().length > 1}
                        />
                      )}
                      {emailField}
                    </>
                  )}

                  {isSignup && step === 1 && (
                    <div className="space-y-1.5">
                      <Field
                        icon={AtSign}
                        label="Username"
                        id="auth-username"
                        name="username"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={username}
                        onChange={setUsername}
                        valid={USERNAME_PATTERN.test(cleanUsername(username))}
                      />
                      <div className="flex items-center justify-between gap-2 pl-1 text-[10px] leading-relaxed text-wa-muted">
                        <span>3-20 characters · letters, numbers, . or _ · no spaces</span>
                        {usernameStatus === 'checking' && (
                          <span className="flex shrink-0 items-center gap-1 text-wa-muted">
                            <Loader2 size={10} className="animate-spin" /> Checking
                          </span>
                        )}
                        {usernameStatus === 'available' && (
                          <span className="flex shrink-0 items-center gap-1 text-wa-green">
                            <Check size={10} /> Available
                          </span>
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="flex shrink-0 items-center gap-1 text-red-300">
                            <X size={10} /> Taken
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {(!isSignup || step === 2) && (
                    <>
                      {passwordField}
                      {isSignup && password && (
                        <div className="-mt-0.5 flex flex-wrap gap-1.5">
                          {passwordChecks.map((check) => (
                            <span
                              key={check.label}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors ${
                                check.ok
                                  ? 'border-wa-green/25 bg-wa-green/[0.07] text-wa-green'
                                  : 'border-white/[0.07] bg-white/[0.02] text-wa-muted'
                              }`}
                            >
                              {check.ok ? <Check size={10} /> : <X size={10} />}
                              {check.label}
                            </span>
                          ))}
                          <span className="ml-auto self-center text-[10px] font-medium text-wa-muted">
                            {strengthLabel}
                          </span>
                        </div>
                      )}
                      {isSignup && (
                        <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-wa-muted">
                          <input
                            id="auth-terms"
                            type="checkbox"
                            checked={agreed}
                            onChange={(event) => {
                              setAgreed(event.target.checked)
                              if (event.target.checked) setError('')
                            }}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-wa-green"
                          />
                          <span>
                            <label htmlFor="auth-terms" className="cursor-pointer">
                              I agree to the{' '}
                            </label>
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="font-medium text-wa-green underline decoration-wa-green/40 underline-offset-2 transition-colors hover:decoration-wa-green"
                            >
                              Terms & Conditions
                            </button>
                            <label htmlFor="auth-terms" className="cursor-pointer">
                              {' '}
                              and the privacy practices of ChatWave.
                            </label>
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <p
                      key={error}
                      role="alert"
                      className="animate-shake flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-red-300"
                    >
                      <X size={14} className="animate-pop mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}
                  {notice && (
                    <p
                      key={notice}
                      role="status"
                      className="animate-pop-in flex items-start gap-2 rounded-xl border border-accent-2/25 bg-accent-2/10 px-3 py-2 text-[12.5px] leading-relaxed text-accent-2"
                    >
                      <Check size={14} className="animate-pop mt-0.5 shrink-0" />
                      <span>{notice}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    {isSignup && step > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStep((value) => value - 1)
                          setError('')
                          setNotice('')
                        }}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-wa-muted transition-colors hover:text-wa-text"
                        aria-label="Previous step"
                      >
                        <ArrowLeft size={17} />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={busy}
                      aria-busy={busy}
                      className="btn-accent btn-shimmer mt-1 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Please wait...
                        </>
                      ) : (
                        <>
                          {isSignup ? (step === 2 ? 'Create account' : 'Continue') : 'Sign in'}
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="mt-5 text-center text-[11px] leading-relaxed text-wa-muted">
                  Secure sessions powered by Supabase. Your chats stay yours.
                  {!isSignup && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="font-medium text-wa-green underline decoration-wa-green/40 underline-offset-2 transition-colors hover:decoration-wa-green"
                      >
                        Terms & Conditions
                      </button>
                    </>
                  )}
                </p>

                <InstallPrompt />
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-wa-muted">
              ChatWave - built by Shivam Kumar
            </p>
          </div>
        </div>
      </div>

      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </div>
  )
}
