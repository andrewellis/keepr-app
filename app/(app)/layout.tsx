import BottomNav from '@/components/BottomNav'
import DesktopNav from '@/components/DesktopNav'
import SiteFooter from '@/components/SiteFooter'
import { ScanSavedProvider } from '@/lib/scan-saved-context'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ScanSavedProvider>
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <DesktopNav isLoggedIn={!!user} />
        <main>{children}</main>
        <SiteFooter />
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </ScanSavedProvider>
  )
}
