'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useScanSaved } from '@/lib/scan-saved-context'

const navItems = [
  { label: 'Home', href: '/home' },
  { label: 'History', href: '/history' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Settings', href: '/settings' },
]

interface ScanHistoryItem {
  id: string
  product_name: string
  results_payload: unknown
}

interface TrackedItem {
  id: string
  title: string
}

export default function SideDrawer() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<ScanHistoryItem[]>([])
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [loadingTracked, setLoadingTracked] = useState(false)
  const fetchedRef = useRef(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const openRef = useRef(open)
  const { subscribe } = useScanSaved()

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      if (!openRef.current && touchStartX.current <= 40 && dx >= 50 && absDx > absDy) {
        setOpen(true)
      } else if (openRef.current && dx <= -50 && absDx > absDy) {
        setOpen(false)
      }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  function fetchRecentSearches() {
    const supabase = createClient()
    setLoadingRecent(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoadingRecent(false)
        return
      }
      supabase
        .from('scan_history')
        .select('id, product_name, results_payload')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4)
        .then(({ data, error }: { data: ScanHistoryItem[] | null; error: unknown }) => {
          if (error) {
            setRecentSearches([])
          } else {
            setRecentSearches(data ?? [])
          }
          setLoadingRecent(false)
        })
    })
  }

  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true

    fetchRecentSearches()

    const supabase = createClient()
    setLoadingTracked(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoadingTracked(false); return }
      supabase
        .from('tracked_items')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data, error }: { data: TrackedItem[] | null; error: unknown }) => {
          setTrackedItems(error ? [] : (data ?? []))
          setLoadingTracked(false)
        })
    })
  }, [open])

  // Re-fetch recent searches whenever a new scan is saved
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      fetchedRef.current = false
      fetchRecentSearches()
    })
    return unsubscribe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-6 h-6 text-foreground flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex-1 flex justify-center">
          <span className="font-bold text-primary">K33pr</span>
        </div>
        <div className="w-6 h-6" />
      </header>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 bottom-0 w-[60vw] bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="pt-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`flex items-center w-full h-12 pl-4 text-sm font-bold transition-colors ${isActive ? 'text-primary bg-primary/5' : 'text-foreground-secondary'}`}
              >
                {item.label}
              </button>
            )
          })}

          <div className="border-t border-border my-4" />

          <p className="text-xs text-foreground-secondary font-medium pl-4 mb-2">Tracked Items</p>

          {loadingTracked ? (
            <div className="mx-4 h-4 rounded bg-gray-200 animate-pulse" />
          ) : (
            trackedItems.map((item) => (
              <Link
                key={item.id}
                href="/tracking"
                onClick={() => setOpen(false)}
                className="flex items-center w-full h-10 pl-4 text-xs text-foreground truncate"
              >
                <span className="truncate">{item.title}</span>
              </Link>
            ))
          )}

          <div className="border-t border-border mt-4" />

          <p className="text-xs text-foreground-secondary font-medium pl-4 mt-2 mb-2">Recent</p>

          {loadingRecent ? (
            <div className="mx-4 h-4 rounded bg-gray-200 animate-pulse" />
          ) : (
            recentSearches.map((item) => (
              <button
                key={item.id}
                onClick={() => item.results_payload
                  ? navigate(`/scan?resume=${item.id}`)
                  : navigate('/history')
                }
                className="flex items-center w-full h-10 pl-4 text-xs text-foreground truncate"
              >
                <span className="truncate">{item.product_name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
