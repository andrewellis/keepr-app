import BottomNav from '@/components/BottomNav'
import DesktopNav from '@/components/DesktopNav'
import { ScanSavedProvider } from '@/lib/scan-saved-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanSavedProvider>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <DesktopNav />
        <main>{children}</main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </ScanSavedProvider>
  )
}
