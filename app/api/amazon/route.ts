import { NextRequest, NextResponse } from 'next/server'
import { searchAmazon } from '@/lib/affiliates/amazon'

export async function POST(req: NextRequest) {
  let body: { query?: string; category?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const query = body.query?.trim()
  const category = body.category?.trim() ?? 'General'

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    const products = await searchAmazon([query], category)
    return NextResponse.json({ products })
  } catch (err) {
    console.error('Amazon search error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
