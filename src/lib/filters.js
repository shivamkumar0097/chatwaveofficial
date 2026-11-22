export const VIDEO_FILTERS = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'glow', label: 'Glow', css: 'brightness(1.12) saturate(1.4) contrast(1.05)' },
  { id: 'retro', label: 'Retro', css: 'sepia(0.55) saturate(1.5) contrast(1.08)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.15)' },
  { id: 'dreamy', label: 'Dreamy', css: 'blur(1px) brightness(1.15) saturate(1.35)' },
  { id: 'neon', label: 'Neon', css: 'hue-rotate(55deg) saturate(2) contrast(1.08)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) brightness(0.85) contrast(1.4)' },
]

export const filterCss = (id) => VIDEO_FILTERS.find((item) => item.id === id)?.css || 'none'
