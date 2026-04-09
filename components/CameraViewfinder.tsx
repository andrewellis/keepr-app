'use client'

import { useRef, useState, useEffect } from 'react'

interface CameraViewfinderProps {
  onCapture: (file: File) => void
  onLibrarySelect: (file: File) => void
}

export default function CameraViewfinder({ onCapture, onLibrarySelect }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<'loading' | 'active' | 'denied' | 'unsupported'>('loading')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }

    const videoEl = videoRef.current

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((stream) => {
        streamRef.current = stream
        if (videoEl) {
          videoEl.srcObject = stream
          videoEl.play().catch(() => {})
        }
        setStatus('active')

        const tracks = stream.getVideoTracks()
        if (tracks.length > 0) {
          const track = tracks[0]
          const capabilities = track.getCapabilities()
          if ((capabilities as { torch?: unknown }).torch !== undefined) {
            setTorchAvailable(true)
          }
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setStatus('denied')
        } else {
          setStatus('unsupported')
        }
      })

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (videoEl) {
        videoEl.srcObject = null
      }
    }
  }, [])

  function handleTorchToggle() {
    if (!torchAvailable || !streamRef.current) return
    const tracks = streamRef.current.getVideoTracks()
    if (tracks.length === 0) return
    const track = tracks[0]
    track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
    setTorchOn((prev) => !prev)
  }

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
        onCapture(file)
      },
      'image/jpeg',
      0.85,
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onLibrarySelect(file)
    }
  }

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#111',
    borderRadius: '0 0 16px 16px',
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(-100px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100px); opacity: 0; }
        }
      `}</style>

      <div style={outerStyle}>
        <video
          ref={videoRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          playsInline
          autoPlay
          muted
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, zIndex: 5 }}>
            Starting camera...
          </div>
        )}

        {/* Denied overlay */}
        {status === 'denied' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 5 }}>
            <p style={{ color: 'white', fontSize: 14 }}>Camera access denied</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#534AB7', color: 'white', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Use File Upload Instead
            </button>
          </div>
        )}

        {/* Unsupported overlay */}
        {status === 'unsupported' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 5 }}>
            <p style={{ color: 'white', fontSize: 14 }}>Camera not available on this browser</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#534AB7', color: 'white', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Use File Upload Instead
            </button>
          </div>
        )}

        {/* Active overlays — reticle, scan line, hint pill */}
        {status === 'active' && (
          <>
            {/* Corner reticle brackets */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ position: 'relative', width: 200, height: 200 }}>
                {/* Top-left */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 28,
                    height: 28,
                    borderTop: '3px solid white',
                    borderLeft: '3px solid white',
                  }}
                />
                {/* Top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderTop: '3px solid white',
                    borderRight: '3px solid white',
                  }}
                />
                {/* Bottom-left */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 28,
                    height: 28,
                    borderBottom: '3px solid white',
                    borderLeft: '3px solid white',
                  }}
                />
                {/* Bottom-right */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderBottom: '3px solid white',
                    borderRight: '3px solid white',
                  }}
                />
              </div>
            </div>

            {/* Scan line */}
            <div
              style={{
                position: 'absolute',
                left: 36,
                right: 36,
                height: 2,
                background:
                  'linear-gradient(to right, transparent, #534AB7, rgba(83,74,183,0.8), #534AB7, transparent)',
                boxShadow: '0 0 8px rgba(83,74,183,0.6)',
                animation: 'scanline 2.4s ease-in-out infinite',
                top: '50%',
                pointerEvents: 'none',
              }}
            />

            {/* Hint pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 14px',
                borderRadius: 20,
                backdropFilter: 'blur(4px)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              Point at product label or tag
            </div>
          </>
        )}
      </div>

      {/* Bottom controls — always render */}
      <div
        style={{
          background: 'white',
          padding: '12px 24px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {/* Library button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#F8F8F6',
              border: '1px solid #E5E5E3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span style={{ fontSize: 11, color: '#6b6b6b' }}>Library</span>
        </div>

        {/* Capture button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: -5,
              borderRadius: '50%',
              border: '2px solid rgba(83,74,183,0.3)',
              pointerEvents: 'none',
            }}
          />
          <button
            onClick={handleCapture}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#534AB7',
              boxShadow: '0 4px 18px rgba(83,74,183,0.45)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        {/* Flash button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={handleTorchToggle}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: torchOn ? 'rgba(83,74,183,0.15)' : '#F8F8F6',
              border: '1px solid #E5E5E3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: torchAvailable ? 1 : 0.3,
              pointerEvents: torchAvailable ? 'auto' : 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={torchOn ? '#534AB7' : '#6b6b6b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 11, color: '#6b6b6b' }}>Flash</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  )
}
