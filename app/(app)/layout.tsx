import BottomNav from '@/components/BottomNav'
import { ScanSavedProvider } from '@/lib/scan-saved-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScanSavedProvider>
      <div className="min-h-screen bg-background pb-16">
        <main>{children}</main>
        <BottomNav />
      </div>
    </ScanSavedProvider>
  )
}
