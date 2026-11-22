import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [keyboard, setKeyboard] = useState(false)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      window.cwInstallPrompt = event
      setPrompt(event)
      setHelp(false)
    }
    const onInstalled = () => {
      setPrompt(null)
      window.cwInstallPrompt = null
      setDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.cwInstallPrompt) setPrompt(window.cwInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const initial = viewport.height
    const onResize = () => setKeyboard(viewport.height < initial - 100)
    viewport.addEventListener('resize', onResize)
    return () => viewport.removeEventListener('resize', onResize)
  }, [])

  if (dismissed || keyboard) return null

  const install = async () => {
    const deferred = prompt || window.cwInstallPrompt
    if (!deferred) {
      setHelp(true)
      return
    }
    deferred.prompt()
    await deferred.userChoice
    setPrompt(null)
    window.cwInstallPrompt = null
    setDismissed(true)
  }

  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
      <Download size={14} className="shrink-0 text-wa-green" />
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-wa-muted">
        {help ? (
          <span>Chrome menu (⋮) → Install app / Add to Home screen</span>
        ) : (
          <>
            <span className="font-medium text-wa-text">Install ChatWave</span> · quick access
          </>
        )}
      </p>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-wa-text transition-colors hover:bg-white/[0.13]"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-wa-muted transition-colors hover:text-wa-text"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
