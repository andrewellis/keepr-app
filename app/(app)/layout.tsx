import SideDrawer from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <SideDrawer />
      <main className="pt-14 min-h-screen overflow-y-auto">{children}</main>
    </div>
  )
}
