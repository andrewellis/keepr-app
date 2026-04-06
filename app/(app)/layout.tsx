import SideDrawer from '@/components/BottomNav'
import { ScanSavedProvider } from '@/lib/scan-saved-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanSavedProvider>
      <div className="bg-background min-h-[100dvh]">
        <SideDrawer />
        <main className="pt-14">{children}</main>
      </div>
    </ScanSavedProvider>
  )
}