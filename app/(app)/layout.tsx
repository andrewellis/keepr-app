import SideDrawer from '@/components/BottomNav'
import { ScanSavedProvider } from '@/lib/scan-saved-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanSavedProvider>
      <div className="min-h-screen bg-background overflow-hidden">
        <SideDrawer />
        <main className="pt-14 min-h-screen overflow-y-auto">{children}</main>
      </div>
    </ScanSavedProvider>
  )
}
