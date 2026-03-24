import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)

  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${id}`

  const download = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `quiz-qr-${id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const copy = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-white">

      {/* Back button */}
      <button
        onClick={() => navigate(`/host/${id}`)}
        className="absolute top-4 left-4 text-white/40 hover:text-white text-sm transition-colors"
      >
        ← Back to host
      </button>

      <img src="/cr-logo.svg" alt="Cloud Revolution" className="h-8 opacity-60 mb-10" />

      {/* QR Code */}
      <div ref={canvasRef} className="bg-white rounded-3xl p-6 shadow-2xl shadow-cyan-900/40 mb-6">
        <QRCodeCanvas value={joinUrl} size={280} />
      </div>

      <p className="text-white/40 text-sm mb-2">Scan to join the quiz</p>
      <p className="text-white/20 font-mono text-xs break-all text-center max-w-sm mb-8">{joinUrl}</p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={copy}
          className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-5 py-3 rounded-xl transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
        <button
          onClick={download}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30"
        >
          Download QR
        </button>
      </div>
    </div>
  )
}
