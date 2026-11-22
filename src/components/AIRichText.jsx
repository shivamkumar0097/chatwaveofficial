import katex from 'katex'
import 'katex/dist/katex.min.css'

const MATH_TOKENS = [
  '\\',
  '^',
  '_',
  '√',
  '∫',
  '∑',
  'θ',
  'π',
  '²',
  '³',
  'sin',
  'cos',
  'tan',
  'log',
  'lim',
  'alpha',
  'beta',
  'gamma',
]

const toLatex = (value) =>
  value
    .replace(/√\s*([a-zA-Z0-9()]+)/g, '\\sqrt{$1}')
    .replace(/([a-zA-Z0-9)])\s*²/g, '$1^2')
    .replace(/([a-zA-Z0-9)])\s*³/g, '$1^3')
    .replace(/θ/g, '\\theta ')
    .replace(/π/g, '\\pi ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/∞/g, '\\infty ')
    .replace(/±/g, '\\pm ')
    .replace(/°/g, '^\\circ ')
    .replace(/∑/g, '\\sum ')
    .replace(/∫/g, '\\int ')

const looksLikeMath = (line) => {
  if (line.length > 140) return false
  if (/^(?:[-•*]|\d+[.)])\s/.test(line)) return false
  const mathHits = MATH_TOKENS.filter((token) => line.includes(token)).length
  return mathHits >= 2 || (mathHits >= 1 && /[=+−]/.test(line))
}

const renderMath = (expression) =>
  katex.renderToString(toLatex(expression), {
    throwOnError: false,
    displayMode: true,
    strict: false,
  })

const inline = (text, key) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g)
  return parts.map((part, index) => {
    const partKey = `${key}-${index}`
    if (part.startsWith('**') && part.endsWith('**'))
      return (
        <strong key={partKey} className="font-semibold text-wa-text">
          {part.slice(2, -2)}
        </strong>
      )
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={partKey} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      )
    if (part.startsWith('$') && part.endsWith('$'))
      return (
        <span
          key={partKey}
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(toLatex(part.slice(1, -1)), {
              throwOnError: false,
              strict: false,
            }),
          }}
        />
      )
    return <span key={partKey}>{part}</span>
  })
}

export default function AIRichText({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let code = []
  let codeKey = 0

  const flushCode = () => {
    if (!code.length) return
    blocks.push(
      <pre
        key={`code-${codeKey++}`}
        className="my-1.5 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-[11px] leading-relaxed"
      >
        {code.join('\n')}
      </pre>,
    )
    code = []
  }

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      flushCode()
      return
    }
    if (code.length) {
      code.push(line)
      return
    }
    const trimmed = line.trim()
    if (!trimmed) {
      blocks.push(<div key={`gap-${index}`} className="h-2" />)
      return
    }
    if (looksLikeMath(trimmed)) {
      blocks.push(
        <div
          key={`math-${index}`}
          className="my-1 overflow-x-auto rounded-lg border border-wa-green/15 bg-wa-green/[0.04] px-2 py-1.5 text-wa-text"
          dangerouslySetInnerHTML={{ __html: renderMath(trimmed) }}
        />,
      )
      return
    }
    const bullet = trimmed.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      blocks.push(
        <div key={`li-${index}`} className="flex gap-1.5 py-0.5 pl-0.5">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-wa-green" />
          <span className="min-w-0 flex-1">{inline(bullet[1], `li-${index}`)}</span>
        </div>,
      )
      return
    }
    const heading = /^[A-Za-z][A-Za-z0-9 /&+-]{1,40}:$/.test(trimmed)
    if (heading) {
      blocks.push(
        <p key={`h-${index}`} className="pt-1 text-[12.5px] font-semibold text-wa-green">
          {inline(trimmed.slice(0, -1), `h-${index}`)}
        </p>,
      )
      return
    }
    blocks.push(
      <p key={`p-${index}`} className="py-0.5">
        {inline(trimmed, `p-${index}`)}
      </p>,
    )
  })
  flushCode()

  return <div className="text-[12.5px] leading-relaxed">{blocks}</div>
}
