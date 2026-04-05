'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const tabs = [
  {
    label: 'Home',
    href: '/home',
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'History',
    href: '/history',
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    label: 'Tracking',
    href: '/tracking',
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function SideDrawer() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleNavClick(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 text-primary"
        aria-label="Open menu"
        style={{ width: 24, height: 24 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-60 z-50 bg-background border-r border-border transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 py-6">
          <span className="font-bold text-primary text-xl">K33pr</span>
        </div>
        <nav>
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href)
            return (
              <button
                key={tab.href}
                onClick={() => handleNavClick(tab.href)}
                className={`flex items-center gap-3 w-full h-12 px-6 transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground-secondary'}`}
              >
                {tab.icon(isActive)}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
