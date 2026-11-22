import { useLayoutEffect, useRef, useState } from 'react'
import { Circle, MessageCircle, Phone, Users } from 'lucide-react'

const TABS = [
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'status', label: 'Status', icon: Circle },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'calls', label: 'Calls', icon: Phone },
]

const PLACEHOLDERS = {
  status: {
    title: 'Status',
    text: 'Status updates will show up here.',
  },
  community: {
    title: 'Community',
    text: 'Community spaces are coming soon.',
  },
  calls: {
    title: 'Calls',
    text: 'Start a voice or video call from any chat.',
  },
}

export function TabPlaceholder({ tab }) {
  const meta = PLACEHOLDERS[tab]
  const Icon = TABS.find((item) => item.key === tab)?.icon || Circle
  if (!meta) return null

  return (
    <section className="tab-fade flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-wa-bg px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-wa-green">
        <Icon size={26} />
      </div>
      <h2 className="text-[17px] font-semibold tracking-tight text-wa-text">{meta.title}</h2>
      <p className="max-w-[240px] text-[12.5px] leading-relaxed text-wa-muted">{meta.text}</p>
    </section>
  )
}

export default function Navigation({ active, onChange, mobile = false }) {
  const navRef = useRef(null)
  const itemRefs = useRef([])
  const draggingRef = useRef(false)
  const pointerRef = useRef(null)
  const lastSwipeRef = useRef(0)
  const startRef = useRef({ x: 0, y: 0 })
  const startIndexRef = useRef(0)
  const lastPointRef = useRef({ x: 0, y: 0 })
  const [layouts, setLayouts] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [dragDx, setDragDx] = useState(0)
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.key === active))

  useLayoutEffect(() => {
    const measure = () => {
      setLayouts(
        itemRefs.current.map((node) =>
          node
            ? {
                left: node.offsetLeft,
                top: node.offsetTop,
                width: node.offsetWidth,
                height: node.offsetHeight,
              }
            : null
        )
      )
    }
    measure()
    const nav = navRef.current
    if (!nav || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [mobile])

  const displayIndex = dragIndex ?? activeIndex
  const pill = layouts[displayIndex]

  const nearestIndex = (clientX, clientY) => {
    let best = 0
    let distance = Infinity
    itemRefs.current.forEach((node, index) => {
      if (!node) return
      const rect = node.getBoundingClientRect()
      const dx = clientX - (rect.left + rect.width / 2)
      const dy = clientY - (rect.top + rect.height / 2)
      const next = dx * dx + dy * dy
      if (next < distance) {
        distance = next
        best = index
      }
    })
    return best
  }

  const beginSwipe = (x, y, index) => {
    draggingRef.current = false
    pointerRef.current = true
    startIndexRef.current = index
    startRef.current = { x, y }
    lastPointRef.current = { x, y }
  }

  const moveSwipe = (x, y) => {
    if (!pointerRef.current) return
    lastPointRef.current = { x, y }
    const dx = x - startRef.current.x
    const dy = y - startRef.current.y
    const axis = mobile ? dx : dy
    const cross = mobile ? dy : dx
    if (!draggingRef.current) {
      if (Math.hypot(dx, dy) < 6) return
      if (Math.abs(axis) < Math.abs(cross)) return
      draggingRef.current = true
    }
    setDragDx(axis)
    setDragIndex(nearestIndex(x, y))
  }

  const endSwipe = (x, y) => {
    if (!pointerRef.current) return
    const wasDragging = draggingRef.current
    pointerRef.current = null
    draggingRef.current = false
    setDragDx(0)
    if (!wasDragging) return
    const dx = x - startRef.current.x
    const dy = y - startRef.current.y
    const axis = mobile ? dx : dy
    let target = nearestIndex(x, y)
    if (Math.abs(axis) >= 20) {
      const step = Math.max(0, Math.min(TABS.length - 1, startIndexRef.current + Math.sign(axis)))
      target = axis > 0 ? Math.max(target, step) : Math.min(target, step)
    }
    setDragIndex(null)
    if (target !== activeIndex) {
      lastSwipeRef.current = Date.now()
      onChange(TABS[target].key)
    }
  }

  const cancelSwipe = () => {
    pointerRef.current = null
    draggingRef.current = false
    setDragDx(0)
    setDragIndex(null)
  }

  const onTabClick = (key) => {
    if (Date.now() - lastSwipeRef.current < 400) return
    onChange(key)
  }

  const swipeHandlers = (index) => ({
    onPointerDown: (event) => {
      if (event.pointerType === 'touch') return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      beginSwipe(event.clientX, event.clientY, index)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {}
    },
    onPointerMove: (event) => {
      if (event.pointerType === 'touch') return
      moveSwipe(event.clientX, event.clientY)
    },
    onPointerUp: (event) => {
      if (event.pointerType === 'touch') return
      endSwipe(event.clientX, event.clientY)
    },
    onPointerCancel: (event) => {
      if (event.pointerType !== 'touch') cancelSwipe()
    },
    onTouchStart: (event) => {
      const touch = event.touches[0]
      if (touch) beginSwipe(touch.clientX, touch.clientY, index)
    },
    onTouchMove: (event) => {
      const touch = event.touches[0]
      if (touch) moveSwipe(touch.clientX, touch.clientY)
    },
    onTouchEnd: (event) => {
      const touch = event.changedTouches[0]
      if (touch) endSwipe(touch.clientX, touch.clientY)
    },
    onTouchCancel: cancelSwipe,
  })

  const baseClass = 'relative z-10 touch-none'

  const indicator = pill && (
    <span
      className={`pointer-events-none absolute left-0 top-0 z-0 border border-white/15 bg-white/[0.14] shadow-[0_10px_30px_-12px_rgba(124,92,255,0.95)] backdrop-blur-md will-change-transform ease-out ${
        dragIndex !== null ? 'transition-none' : 'transition-transform duration-200'
      } ${mobile ? 'rounded-xl' : 'rounded-2xl'}`}
      style={{
        width: pill.width,
        height: pill.height,
        transform: `translate3d(${pill.left + (mobile ? dragDx : 0)}px, ${pill.top + (mobile ? 0 : dragDx)}px, 0)`,
      }}
    />
  )

  if (mobile) {
    return (
      <nav
        ref={navRef}
        className="animate-fade-up fixed inset-x-0 bottom-0 z-40 flex h-16 touch-none items-center justify-around border-t border-wa-border bg-wa-bg/95 backdrop-blur-xl md:hidden"
      >
        {indicator}
        {TABS.map((tab, index) => {
          const activeTab = displayIndex === index
          return (
            <button
              key={tab.key}
              ref={(node) => {
                itemRefs.current[index] = node
              }}
              type="button"
              {...swipeHandlers(index)}
              onClick={() => onTabClick(tab.key)}
              className={`${baseClass} flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors duration-300 ${
                activeTab ? 'text-wa-green' : 'text-wa-muted'
              }`}
            >
              <tab.icon
                size={19}
                className={`transition-transform duration-300 ${activeTab ? '-translate-y-0.5 scale-110' : ''}`}
              />
              {tab.label}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      className="relative hidden h-full w-[74px] shrink-0 flex-col items-center gap-2 border-r border-wa-border bg-wa-bg py-4 md:flex"
    >
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-wa-green/15 text-wa-green">
        <MessageCircle size={20} />
      </div>
      {indicator}
      {TABS.map((tab, index) => {
        const activeTab = displayIndex === index
        return (
          <button
            key={tab.key}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            type="button"
            {...swipeHandlers(index)}
            onClick={() => onTabClick(tab.key)}
            title={tab.label}
            aria-label={tab.label}
            className={`${baseClass} flex w-16 flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors duration-300 ${
              activeTab ? 'text-wa-green' : 'text-wa-muted hover:text-wa-text'
            }`}
          >
            <tab.icon
              size={20}
              className={`transition-transform duration-300 ${activeTab ? '-translate-y-0.5 scale-110' : ''}`}
            />
            <span className="text-[9.5px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
