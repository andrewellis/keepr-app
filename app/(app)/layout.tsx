import SideDrawer from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SideDrawer />
      <main className="pt-14">{children}</main>
    </div>
  )
}
