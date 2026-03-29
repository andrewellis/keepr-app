import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'

export default async function SettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background px-5 pt-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      {/* Profile section */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">Name</span>
            <span className="text-sm text-foreground font-medium">
              {profile?.full_name ?? '—'}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground-secondary">Email</span>
            <span className="text-sm text-foreground font-medium">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <form action={signout}>
          <button
            type="submit"
            className="w-full text-left px-5 py-4 text-sm font-medium text-red-400 hover:bg-red-900/10 transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
