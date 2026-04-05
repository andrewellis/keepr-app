import SideDrawer from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SideDrawer />
      {children}
    </div>
  )
}
