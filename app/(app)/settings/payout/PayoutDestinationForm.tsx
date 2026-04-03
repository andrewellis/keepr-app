'use client'

import { useState } from 'react'
import { updatePayoutDestination } from '@/app/auth/actions'

interface Props {
  currentDestination: string | null
  balanceCents?: number
}

export default function PayoutDestinationForm({ currentDestination, balanceCents = 0 }: Props) {
  const [value, setValue] = useState(currentDestination ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function validate(input: string): string | null {
    if (!input.trim()) return null // empty is allowed (server validates)
    if (input.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(input)) return 'Please enter a valid email address.'
    } else {
      const digits = input.replace(/\D/g, '')
      if (digits.length > 0 && digits.length < 10) return 'Please enter a valid 10-digit phone number.'
    }
    return null
  }

  function handleChange(newValue: string) {
    setValue(newValue)
    setValidationError(validate(newValue))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Client-side validation check
    const vError = validate(value)
    if (vError) {
      setValidationError(vError)
      return
    }

    // Destination change confirmation when user has a balance
    if (balanceCents > 0 && value.trim() !== (currentDestination ?? '')) {
      const confirmed = window.confirm(
        'Changing your payout destination will apply to your next payout. Continue?'
      )
      if (!confirmed) return
    }

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
          onChange={(e) => handleChange(e.target.value)}
          placeholder="you@example.com or (555) 867-5309"
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
        />
        <p className="mt-1.5 text-xs text-foreground-secondary leading-relaxed">
          We send payouts via PayPal. If your email or phone is linked to Venmo, you&apos;ll
          receive it there automatically.
        </p>
      </div>

      {validationError && (
        <p className="text-xs text-red-600">{validationError}</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-xs text-green-600 font-medium">✓ Payout destination saved.</p>
      )}

      <button
        type="submit"
        disabled={saving || !!validationError}
        className="rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
