'use client'

import { createContext, useContext, useRef, useCallback } from 'react'

interface ScanSavedContextValue {
  notifyScanSaved: () => void
  subscribe: (cb: () => void) => () => void
}

const ScanSavedContext = createContext<ScanSavedContextValue | null>(null)

export function ScanSavedProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Set<() => void>>(new Set())

  const notifyScanSaved = useCallback(() => {
    listenersRef.current.forEach((cb) => cb())
  }, [])

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb)
    return () => {
      listenersRef.current.delete(cb)
    }
  }, [])

  return (
    <ScanSavedContext.Provider value={{ notifyScanSaved, subscribe }}>
      {children}
    </ScanSavedContext.Provider>
  )
}

export function useScanSaved() {
  const ctx = useContext(ScanSavedContext)
  if (!ctx) throw new Error('useScanSaved must be used within ScanSavedProvider')
  return ctx
}
