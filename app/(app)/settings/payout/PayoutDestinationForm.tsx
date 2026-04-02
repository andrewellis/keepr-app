'use client'

import { useState } from 'react'
import { updatePayoutDestination } from '@/app/auth/actions'

interface Props {
  currentDestination: string | null
}

export default function PayoutDestinationForm({ currentDestination }: Props) {
  const [value, setValue] = useState(currentDestination ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.set('payout_destination', value)

    const result = await updatePayoutDestination(formData)
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
        <label htmlFor="payout_destination" className="block text-sm font-medium text-foreground mb-1.5">
          PayPal email or Venmo phone number
        </label>
        <input
          id="payout_destination"
          name="payout_destination"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="you@example.com or (555) 867-5309"
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
        />
        <p className="mt-1.5 text-xs text-foreground-secondary leading-relaxed">
          We send payouts via PayPal. If your email or phone is linked to Venmo, you&apos;ll
          receive it there automatically.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-xs text-green-600 font-medium">✓ Payout destination saved.</p>
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
