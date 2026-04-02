'use client'

import { useState } from 'react'
import { updateCashbackRate } from '@/app/auth/actions'

interface Props {
  currentRate: number // stored as decimal e.g. 0.050
}

export default function CashbackRateForm({ currentRate }: Props) {
  // Display as percentage string e.g. "5.0"
  const [value, setValue] = useState(
    currentRate > 0 ? (currentRate * 100).toFixed(1) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.set('cashback_rate', value)

    const result = await updateCashbackRate(formData)
    setSaving(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="cashback_rate" className="block text-sm font-medium text-foreground mb-1.5">
          Your card&apos;s cashback rate (%)
        </label>
        <div className="relative">
          <input
            id="cashback_rate"
            name="cashback_rate"
            type="number"
            step="0.1"
            min="0"
            max="30"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="5.0"
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-secondary pointer-events-none">
            %
          </span>
        </div>
        <p className="mt-1.5 text-xs text-foreground-secondary leading-relaxed">
          Enter the cashback % your credit card pays on purchases. This is shown as a separate
          line item in your savings estimate — it is not paid by K33pr.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-xs text-green-600 font-medium">✓ Cashback rate saved.</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
