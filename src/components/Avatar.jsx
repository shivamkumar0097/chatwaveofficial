export default function Avatar({ name, color = '#7c5cff', size = 'md', online, src, ring = false }) {
  const boxes = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-[46px] w-[46px]',
    xl: 'h-24 w-24',
    xxl: 'h-64 w-64',
  }
  const texts = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-[15px]',
    xl: 'text-2xl',
    xxl: 'text-6xl',
  }

  const initials = (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const inner = src ? (
    <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
  ) : (
    <div
      className={`grid h-full w-full place-items-center rounded-full font-semibold text-white ${texts[size]}`}
      style={{
        backgroundImage: `linear-gradient(140deg, ${color}, ${color}99 60%, #22d3ee88)`,
      }}
    >
      {initials}
    </div>
  )

  return (
    <div className="relative shrink-0">
      {ring ? (
        <div className="ring-gradient rounded-full p-[2px] shadow-[0_6px_18px_-8px_rgba(124,92,255,0.8)]">
          <div className={`${boxes[size]} overflow-hidden rounded-full bg-wa-panel p-[2px]`}>
            {inner}
          </div>
        </div>
      ) : (
        <div className={`${boxes[size]} overflow-hidden rounded-full`}>{inner}</div>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-wa-panel bg-accent-2 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
      )}
    </div>
  )
}
