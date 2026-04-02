'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Payout = {
  id: string
  amount_cents: number
  status: string
  created_at: string
  completed_at: string | null
}

type Transaction = {
  id: string
  click_id: string
  product_name: string
  retailer: string
  price_cents: number
  commission_rate: number
  commission_cents: number
  user_payout_cents: number
  status: string
  commission_status: string | null
  payout_held_until: string | null
  payout_hold_released: boolean
  link_clicked_at: string | null
  confirmed_at: string | null
  paid_at: string | null
  created_at: string
  payouts: Payout | Payout[] | null
}

function fmt(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPayout(tx: Transaction): Payout | null {
  if (!tx.payouts) return null
  if (Array.isArray(tx.payouts)) return tx.payouts[0] ?? null
  return tx.payouts
}

function statusBadge(tx: Transaction): { text: string; color: string } {
  if (tx.commission_status === 'reversed') {
    return { text: 'Returned', color: 'bg-red-100 text-red-700' }
  }
  switch (tx.status) {
    case 'clicked':
      return { text: 'Pending', color: 'bg-gray-100 text-gray-600' }
    case 'confirmed':
      if (!tx.payout_hold_released && tx.payout_held_until) {
        return { text: `Confirmed — Hold until ${fmtDate(tx.payout_held_until)}`, color: 'bg-blue-100 text-blue-700' }
      }
      return { text: 'Confirmed', color: 'bg-blue-100 text-blue-700' }
    case 'processing':
      return { text: 'Processing', color: 'bg-yellow-100 text-yellow-700' }
    case 'completed':
    case 'paid':
      return { text: 'Paid', color: 'bg-green-100 text-green-700' }
    case 'failed':
      return { text: 'Failed', color: 'bg-red-100 text-red-700' }
    default:
      return { text: tx.status, color: 'bg-gray-100 text-gray-600' }
  }
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  useEffect(() => {
    fetch('/api/transaction/history')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setTransactions(data.transactions ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-1">History</h1>
      <p className="text-sm text-foreground-secondary mb-6">
        {!loading && !error
          ? transactions.length > 0
            ? `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
            : 'Your transaction history'
          : ''}
      </p>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl px-4 py-4 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-surface border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-sm text-foreground-secondary">Failed to load history. Please try again.</p>
        </div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center">
            <svg className="w-9 h-9 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold">No transactions yet.</p>
            <p className="text-foreground-secondary text-sm mt-1">Scan a product to get started!</p>
          </div>
          <Link href="/scan" className="mt-2 bg-primary text-white text-sm font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition">
            Scan a Product
          </Link>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const badge = statusBadge(tx)
            const payout = getPayout(tx)
            return (
              <button
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-4 flex items-center justify-between text-left hover:border-primary transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.product_name}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5">
                      {tx.retailer} · {fmtDate(tx.link_clicked_at ?? tx.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-foreground">
                    {payout ? fmt(payout.amount_cents) : fmt(tx.user_payout_cents)}
                  </p>
                  <span className={`inline-block text-xs mt-0.5 px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setSelectedTx(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-background rounded-t-3xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

            <h2 className="text-base font-bold text-foreground mb-1">{selectedTx.product_name}</h2>
            <p className="text-sm text-foreground-secondary mb-4">{selectedTx.retailer}</p>

            <div className="space-y-3">
              <DetailRow label="Click ID" value={selectedTx.click_id} mono />

              {selectedTx.price_cents > 0 && (
                <DetailRow label="Price" value={fmt(selectedTx.price_cents)} />
              )}

              {selectedTx.commission_rate > 0 && (
                <DetailRow label="Commission rate" value={`${Math.round(selectedTx.commission_rate * 100)}%`} />
              )}

              {selectedTx.commission_cents > 0 && (
                <DetailRow label="Commission amount" value={fmt(selectedTx.commission_cents)} />
              )}

              <DetailRow label="GRMtek fee" value="$0.20" />

              <DetailRow
                label="Your K33pr payout"
                value={fmt(selectedTx.user_payout_cents)}
                highlight
              />

              {selectedTx.price_cents > 0 && (
                <div className="bg-surface border border-border rounded-xl p-3">
                  <p className="text-xs text-foreground-secondary">
                    Est. card cashback (from your card, not K33pr) — depends on your card rate
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                {selectedTx.link_clicked_at && (
                  <DetailRow label="Clicked" value={fmtDate(selectedTx.link_clicked_at) ?? ''} />
                )}
                {selectedTx.confirmed_at && (
                  <DetailRow label="Confirmed" value={fmtDate(selectedTx.confirmed_at) ?? ''} />
                )}
                {selectedTx.paid_at && (
                  <DetailRow label="Paid" value={fmtDate(selectedTx.paid_at) ?? ''} />
                )}
                {selectedTx.payout_held_until && !selectedTx.payout_hold_released && (
                  <DetailRow label="Hold releases" value={fmtDate(selectedTx.payout_held_until) ?? ''} />
                )}
              </div>

              {(() => {
                const payout = getPayout(selectedTx)
                if (!payout) return null
                return (
                  <div className="border-t border-border pt-3 space-y-2">
                    <DetailRow label="Payout amount" value={fmt(payout.amount_cents)} />
                    <DetailRow label="Payout status" value={payout.status} />
                    {payout.completed_at && (
                      <DetailRow label="Payout date" value={fmtDate(payout.completed_at) ?? ''} />
                    )}
                  </div>
                )
              })()}

              <div className="border-t border-border pt-3">
                {(() => {
                  const badge = statusBadge(selectedTx)
                  return (
                    <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  )
                })()}
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="mt-6 w-full bg-surface border border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:border-primary transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-foreground-secondary shrink-0">{label}</p>
      <p className={`text-xs text-right ${mono ? 'font-mono' : ''} ${highlight ? 'font-semibold text-primary' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}
