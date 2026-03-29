import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HistoryPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">History</h1>
      <p className="text-sm text-foreground-secondary mb-6">Your transaction history will appear here.</p>

      <div className="bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-foreground-secondary text-sm">No transactions yet.</p>
        <p className="text-foreground-secondary text-xs mt-1">Scan a receipt to get started.</p>
      </div>
    </div>
  )
}
