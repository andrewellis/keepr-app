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

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const hasTransactions = transactions && transactions.length > 0

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  function statusBadge(status: string): { text: string; textColor: string; bgColor: string } {
    switch (status) {
      case 'clicked':
        return { text: 'Clicked through', textColor: '#534AB7', bgColor: '#EEEDFE' }
      case 'pending':
        return { text: 'Pending', textColor: '#92400E', bgColor: '#FEF3C7' }
      case 'confirmed':
        return { text: 'Confirmed', textColor: '#065F46', bgColor: '#D1FAE5' }
      case 'paid':
        return { text: 'Paid', textColor: '#065F46', bgColor: '#D1FAE5' }
      case 'scanned':
      default:
        return { text: 'Scanned', textColor: '#666666', bgColor: '#F8F8F6' }
    }
  }

  function showEarnings(status: string, userPayoutCents: number | null): boolean {
    if (status === 'scanned' || status === 'clicked') {
      return !!userPayoutCents && userPayoutCents > 0
    }
    return true
  }

  function retailerLabel(status: string, retailer: string | null): string {
    if (status === 'scanned' && !retailer) return 'Product identified'
    return retailer ?? ''
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-1">History</h1>
      <p className="text-sm text-foreground-secondary mb-6">
        {hasTransactions
          ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
          : 'Your transaction history'}
      </p>

      {/* Empty state */}
      {!hasTransactions && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center">
            <svg
              className="w-9 h-9 text-foreground-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold">No items yet</p>
            <p className="text-foreground-secondary text-sm mt-1">
              Scan a product to log your first earning.
            </p>
          </div>
          <a
            href="/scan"
            className="mt-2 bg-primary text-white text-sm font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition"
          >
            Scan a Product
          </a>
        </div>
      )}

      {/* Transaction list */}
      {hasTransactions && (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-surface border border-border rounded-2xl px-4 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5 text-foreground-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tx.product_name}
                  </p>
                  <p className="text-xs text-foreground-secondary mt-0.5">
                    {retailerLabel(tx.status, tx.retailer)
                      ? `${retailerLabel(tx.status, tx.retailer)} · `
                      : ''}{formatDate(tx.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold text-foreground">
                  {showEarnings(tx.status, tx.user_payout_cents)
                    ? formatAmount(tx.user_payout_cents / 100)
                    : '—'}
                </p>
                {(() => {
                  const badge = statusBadge(tx.status)
                  return (
                    <span
                      className="inline-block text-xs mt-0.5 px-1.5 py-0.5 rounded-full font-medium"
                      style={{ color: badge.textColor, backgroundColor: badge.bgColor }}
                    >
                      {badge.text}
                    </span>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
