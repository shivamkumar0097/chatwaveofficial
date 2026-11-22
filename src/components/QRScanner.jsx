import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { parseQrPayload } from '@/lib/qr'

export default function QRScanner({ onClose, onPick }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const scannedRef = useRef(false)
  const onPickRef = useRef(onPick)
  const [error, setError] = useState('')

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let active = true
    const video = videoRef.current
    const controlsRefLocal = controlsRef
    const reader = new BrowserQRCodeReader()

    reader
      .decodeFromVideoDevice(undefined, video, (result) => {
        if (!active || scannedRef.current || !result) return
        scannedRef.current = true
        onPickRef.current(parseQrPayload(result.getText()))
      })
      .then((controls) => {
        if (!active) controls.stop()
        else controlsRefLocal.current = controls
      })
      .catch(() => {
        if (active) setError('Camera could not be started. Check camera permission.')
      })

    return () => {
      active = false
      controlsRefLocal.current?.stop()
      video?.srcObject?.getTracks?.().forEach((track) => track.stop())
    }
  }, [])

  return (
    <div className="animate-fade-in fixed inset-0 z-[140] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onClose}
        className="icon-btn absolute right-4 top-4 text-white"
        aria-label="Close scanner"
      >
        <X size={22} />
      </button>

      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-white/15 bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <span className="absolute left-4 top-4 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-wa-green" />
        <span className="absolute right-4 top-4 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-wa-green" />
        <span className="absolute bottom-4 left-4 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-wa-green" />
        <span className="absolute bottom-4 right-4 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-wa-green" />
      </div>

      <p className="mt-5 text-center text-[13px] font-medium text-white">
        {error || 'Point your camera at a ChatWave QR code'}
      </p>
      <p className="mt-1 text-center text-[11px] text-white/60">
        Scan a code to start a chat instantly
      </p>
    </div>
  )
}
