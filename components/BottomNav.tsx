'use client'

import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { label: 'Home', href: '/home', icon: 'home' },
  { label: 'Scan', href: '/scan', icon: 'scan' },
  { label: 'Tracking', href: '/tracking', icon: 'tracking' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
]

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? '#534AB7' : '#aaaaaa'
  switch (icon) {
    case 'home':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'scan':
      return (
        <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#534AB7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -18, boxShadow: '0 2px 8px rgba(83,74,183,0.3)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" fill="white" />
          </svg>
        </div>
      )
    case 'tracking':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    case 'settings':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTop: '0.5px solid #ebebeb', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 6, paddingBottom: 'max(4px, env(safe-area-inset-bottom))', zIndex: 50 }}>
      {tabs.map(tab => {
        const isActive = tab.href === '/scan' ? pathname === '/scan' : pathname.startsWith(tab.href)
        const isScan = tab.icon === 'scan'
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isScan ? 0 : 2, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <TabIcon icon={tab.icon} active={isActive} />
            <span style={{ fontSize: 10, color: isActive ? '#534AB7' : '#aaaaaa', fontWeight: isActive ? 500 : 400 }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
