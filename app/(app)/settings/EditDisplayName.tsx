'use client'

import { useState, useTransition } from 'react'
import { updateDisplayName } from '@/app/auth/actions'

export default function EditDisplayName({ currentName }: { currentName: string }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleEdit() {
    setEditing(true)
    setError(null)
    setSuccess(false)
  }

  function handleCancel() {
    setName(currentName)
    setEditing(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateDisplayName(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="px-4 py-4">
        <label className="block text-xs text-foreground-secondary mb-1.5">Display Name</label>
        <input
          name="full_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary transition"
          placeholder="Your name"
        />
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 bg-background border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:border-primary transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex-1 bg-primary rounded-xl py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <span className="text-sm text-foreground-secondary">Display Name</span>
      <div className="flex items-center gap-2">
        {success && (
          <span className="text-xs text-green-400">Saved</span>
        )}
        <span className="text-sm text-foreground font-medium">
          {name || '—'}
        </span>
        <button
          onClick={handleEdit}
          className="text-xs text-primary font-medium hover:opacity-80 transition"
        >
          Edit
        </button>
      </div>
    </div>
  )
}
