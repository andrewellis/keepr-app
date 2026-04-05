import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: Request) {
  const body = await request.json()
  const { contextQuery, serpResults, productName } = body

  if (!contextQuery || !serpResults || !Array.isArray(serpResults)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Build a concise results summary for Claude
  const resultsSummary = serpResults
    .slice(0, 10)
    .map((r: { title?: string; price?: number; retailerDomain?: string; in_stock?: boolean; delivery?: string[] }) =>
      `- ${r.retailerDomain ?? 'unknown'}: $${r.price ?? 'N/A'}${r.in_stock === true ? ' (in stock)' : ''}${r.delivery?.[0] ? ` — ${r.delivery[0]}` : ''}`
    )
    .join('\n')

  const prompt = `You are a shopping assistant. A user scanned a product and has a specific need or constraint.

Product: ${productName}
User's context: "${contextQuery}"

Current prices found:
${resultsSummary}

Based on the user's context and the prices above, write a 2-3 sentence advisory. Be direct and specific. Reference actual prices and retailers when relevant. Do not use bullet points. Do not start with "Based on" or "I".`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const advisory = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ advisory })
  } catch (err) {
    console.error('context advisory error:', err)
    return NextResponse.json({ error: 'Failed to generate advisory' }, { status: 500 })
  }
}
