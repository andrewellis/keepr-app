'use client'

import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'keepr_install_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleAdd() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setVisible(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
      style={{
        bottom: '64px',
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
      }}
    >
      <p className="text-white text-xs flex-1 mr-3">
        Add K33pr to your home screen
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: '#FF6B35' }}
        >
          Add
        </button>
        <button
          onClick={handleDismiss}
          className="px-2 py-1.5 text-sm font-medium"
          style={{ color: '#9ca3af' }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
