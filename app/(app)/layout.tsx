import SideDrawer from '@/components/BottomNav'
import { ScanSavedProvider } from '@/lib/scan-saved-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanSavedProvider>
      <div className="h-[100dvh] bg-background overflow-hidden flex flex-col">
        <SideDrawer />
        <main className="flex-1 overflow-y-auto pt-14" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</main>
      </div>
    </ScanSavedProvider>
  )
}
