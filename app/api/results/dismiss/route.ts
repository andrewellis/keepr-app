import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productName, resultUrl, resultTitle } = body

    if (!productName || !resultUrl || !resultTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await supabase.from('dismissed_results').upsert({
      user_id: user.id,
      product_name: productName,
      result_url: resultUrl,
      result_title: resultTitle,
    }, { onConflict: 'user_id,product_name,result_url' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Dismiss error:', err)
    return NextResponse.json({ error: 'Failed to dismiss result' }, { status: 500 })
  }
}
