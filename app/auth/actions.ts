'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('display_name') as string
  const inviteCode = (formData.get('invite_code') as string ?? '').trim()

  // Validate invite code
  const rawCodes = process.env.INVITE_CODES ?? ''
  const validCodes = rawCodes
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)

  if (validCodes.length > 0) {
    if (!inviteCode || !validCodes.includes(inviteCode.toUpperCase())) {
      return { error: 'K33pr is in beta. Enter your invite code to join.' }
    }
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Save invite code to profile (best-effort — profile row created by trigger)
  if (authData.user && inviteCode) {
    try {
      await supabase
        .from('profiles')
        .update({ invite_code: inviteCode.toUpperCase() })
        .eq('id', authData.user.id)
    } catch {
      // Non-fatal — profile trigger may not have fired yet; ignore
    }
  }

  revalidatePath('/', 'layout')
  redirect('/verify-email')
}

export async function signout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function resetPassword(formData: FormData) {
  const supabase = createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function updateDisplayName(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const fullName = (formData.get('full_name') as string).trim()

  if (!fullName) {
    return { error: 'Name cannot be empty' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/home')
  return { success: true }
}

export async function updateCashbackRate(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const rateStr = (formData.get('cashback_rate') as string ?? '').trim()
  const rateNum = parseFloat(rateStr)

  if (isNaN(rateNum) || rateNum < 0 || rateNum > 30) {
    return { error: 'Rate must be between 0 and 30.' }
  }

  // User enters "5.0" → stored as 0.050
  const storedRate = rateNum / 100

  const { error } = await supabase
    .from('profiles')
    .update({ cashback_rate: storedRate, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updatePayoutDestination(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const raw = (formData.get('payout_destination') as string ?? '').trim()

  if (!raw) {
    return { error: 'Please enter a PayPal email or Venmo phone number.' }
  }

  let destination: string
  let destinationType: 'email' | 'phone'

  if (raw.includes('@')) {
    // Validate basic email format: x@y.z
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(raw)) {
      return { error: 'Please enter a valid email address.' }
    }
    destination = raw.toLowerCase()
    destinationType = 'email'
  } else {
    // Strip non-digits and validate 10+ digits
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10) {
      return { error: 'Please enter a valid 10-digit phone number.' }
    }
    destination = digits
    destinationType = 'phone'
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      payout_destination: destination,
      payout_destination_type: destinationType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/payout')
  return { success: true }
}
