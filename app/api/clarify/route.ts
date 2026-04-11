import { NextRequest, NextResponse } from 'next/server'

type ClarifyResponse =
  | { action: 'search'; refinedQuery: string }
  | { action: 'clarify'; message: string; suggestions: string[] }

const SYSTEM_PROMPT = `You are a product search assistant for a shopping comparison app. Your job is to determine if a user's search query is specific enough to find the right product, or if you need to ask a clarifying question.
A query is SPECIFIC ENOUGH if it contains:

A brand name AND model/product name (e.g., "Sony WH-1000XM5", "Nike Air Max 90", "iPhone 15 Pro")
OR a very specific product description (e.g., "64oz stainless steel water bottle with straw lid")

A query NEEDS CLARIFICATION if it is:

Just a category (e.g., "headphones", "running shoes", "laptop")
Vague or broad (e.g., "gift for mom", "something for camping")
Missing key details that would affect which product to show (e.g., "Nike shoes" — what type?)

Respond ONLY with a JSON object, no markdown, no backticks:
If specific enough:
{"action": "search", "refinedQuery": "the specific product search string"}
If needs clarification:
{"action": "clarify", "message": "your question to the user (1-2 sentences, conversational)", "suggestions": ["option 1", "option 2", "option 3"]}
Rules:

Ask only ONE question at a time
Provide exactly 3 suggestion options that are tappable
Keep suggestions short (2-5 words each)
Be conversational and helpful, not robotic
When you have enough info to construct a specific search, return action: "search" with a refined query that combines everything the user has told you
The refinedQuery should be what someone would type into a shopping search engine`

function buildRefinedQueryFromHistory(
  query: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): string {
  const userMessages = [query]
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      userMessages.push(messages[i].content)
    }
  }
  return userMessages.join(' ')
}

export async function POST(req: NextRequest): Promise<NextResponse<ClarifyResponse>> {
  let body: { query: string; messages?: { role: 'user' | 'assistant'; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ action: 'search', refinedQuery: '' })
  }

  const { query, messages = [] } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ action: 'search', refinedQuery: query }, { status: 500 })
  }

  if (messages.length >= 6) {
    const refinedQuery = buildRefinedQueryFromHistory(query, messages)
    return NextResponse.json({ action: 'search', refinedQuery })
  }

  const builtMessages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: query },
  ]
  for (const msg of messages) {
    builtMessages.push({ role: msg.role, content: msg.content })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: builtMessages,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json({ action: 'search', refinedQuery: query })
    }

    const data = await response.json()
    const text: string = data.content?.[0]?.text?.trim() ?? ''
    if (!text) {
      return NextResponse.json({ action: 'search', refinedQuery: query })
    }

    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    if (parsed.action === 'search') {
      if (typeof parsed.refinedQuery === 'string' && parsed.refinedQuery.length > 0) {
        return NextResponse.json({ action: 'search', refinedQuery: parsed.refinedQuery })
      }
      return NextResponse.json({ action: 'search', refinedQuery: query })
    }

    if (parsed.action === 'clarify') {
      if (
        typeof parsed.message === 'string' &&
        parsed.message.length > 0 &&
        Array.isArray(parsed.suggestions) &&
        parsed.suggestions.length >= 1 &&
        parsed.suggestions.length <= 4
      ) {
        return NextResponse.json({
          action: 'clarify',
          message: parsed.message,
          suggestions: parsed.suggestions,
        })
      }
      return NextResponse.json({ action: 'search', refinedQuery: query })
    }

    return NextResponse.json({ action: 'search', refinedQuery: query })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ action: 'search', refinedQuery: query })
  }
}
