import { NextRequest, NextResponse } from 'next/server'

interface ScanResult {
  productName: string | null
  category: string | null
  confidence: number
  searchTerms: string[]
  error: string | null
}

const NON_PRODUCT_TERMS = [
  'tan', 'white', 'black', 'blue', 'red', 'green', 'yellow', 'brown', 'gray', 'grey', 'beige', 'cream', 'orange', 'pink', 'purple',
  'wall', 'ceiling', 'floor', 'surface', 'texture', 'pattern', 'color', 'colour', 'paint', 'background',
  'wood', 'concrete', 'brick', 'tile', 'metal', 'plastic', 'fabric', 'paper',
  'room', 'interior', 'exterior', 'building', 'architecture',
  'sky', 'cloud', 'grass', 'tree', 'water', 'ground', 'dirt', 'sand',
  'light', 'shadow', 'dark', 'bright',
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Apparel & Accessories': ['shirt', 'dress', 'jacket', 'clothing', 'apparel', 'fashion', 'jeans', 'pants', 'sweater', 'hoodie', 'coat', 'blouse', 't-shirt'],
  'Shoes': ['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'slipper', 'footwear'],
  'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'headphone', 'speaker', 'camera', 'tv', 'television', 'monitor', 'keyboard', 'mouse', 'charger', 'cable', 'electronic'],
  'Home & Garden': ['furniture', 'lamp', 'pillow', 'blanket', 'towel', 'kitchen', 'garden', 'plant', 'vase', 'candle', 'rug', 'curtain', 'home', 'decor'],
  'Beauty': ['makeup', 'cosmetic', 'skincare', 'lipstick', 'mascara', 'perfume', 'fragrance', 'lotion', 'cream', 'serum', 'beauty', 'shampoo', 'conditioner'],
  'Sports': ['ball', 'racket', 'yoga', 'fitness', 'gym', 'sport', 'athletic', 'exercise', 'bike', 'bicycle', 'weight', 'dumbbell'],
  'Books': ['book', 'novel', 'textbook', 'paperback', 'hardcover', 'reading', 'literature'],
}

function mapToCategory(labels: string[], webEntities: string[]): string {
  const allTerms = [...labels, ...webEntities].map(t => t.toLowerCase())
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const term of allTerms) {
      if (keywords.some(kw => term.includes(kw))) {
        return category
      }
    }
  }
  return 'General'
}

function errorResult(error: string): ScanResult {
  return { productName: null, category: null, confidence: 0, searchTerms: [], error }
}

async function identifyProductWithClaude(
  imageBase64: string,
  mimeType: string,
  visionLabels: string[],
  visionBestGuess: string | null
): Promise<{ productName: string; searchTerms: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const claudeController = new AbortController()
  const claudeTimeout = setTimeout(() => claudeController.abort(), 10_000)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a product identification assistant for a shopping comparison website. Identify the specific product in this image.

Google Vision detected these labels: ${visionLabels.join(', ')}
Google Vision best guess: ${visionBestGuess || 'none'}

Your job: identify the SPECIFIC product — brand, model name, variant (color, size, generation) if visible. Be as specific as possible.

Respond ONLY with a JSON object, no markdown, no backticks:
{"productName": "Brand Model Variant", "searchTerms": ["most specific search term", "broader search term", "brand + category"]}

Examples of good responses:
{"productName": "Nike Air Max 90 White/Black", "searchTerms": ["Nike Air Max 90 White Black", "Nike Air Max 90", "Nike sneakers"]}
{"productName": "Apple AirPods Pro 2nd Generation", "searchTerms": ["Apple AirPods Pro 2nd Generation", "AirPods Pro 2", "Apple earbuds"]}
{"productName": "Stanley Quencher H2.0 Tumbler 40oz Cream", "searchTerms": ["Stanley Quencher H2.0 40oz Cream", "Stanley Quencher tumbler", "Stanley water bottle"]}

If you cannot identify a specific product, still try to be as specific as possible with brand and type:
{"productName": "Yeti Rambler Mug", "searchTerms": ["Yeti Rambler Mug", "Yeti coffee mug", "Yeti drinkware"]}

If the image does not contain a product at all, respond:
{"productName": null, "searchTerms": []}`,
            },
          ],
        }],
      }),
      signal: claudeController.signal,
    })

    clearTimeout(claudeTimeout)

    if (!response.ok) {
      const errText = await response.text(); console.error("[scan] Claude API error:", response.status, errText); return null
      return null
    }

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim()
    if (!text) { return null }

    // Parse JSON response, strip any markdown fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.productName) return null

    return {
      productName: parsed.productName,
      searchTerms: parsed.searchTerms || [parsed.productName],
    }
  } catch (err) {
    clearTimeout(claudeTimeout)
    console.error('Claude identification error:', err)
    return null // Fall back to Vision results
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ScanResult>> {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(errorResult('invalid_input'), { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) {
    return NextResponse.json(errorResult('missing image'), { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(errorResult('invalid_input'), { status: 400 })
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  if (!apiKey) {
    // Mock response when Vision API key is not configured
    return NextResponse.json({
      productName: 'Mock Product',
      category: 'General',
      confidence: 0.85,
      searchTerms: ['mock product'],
      error: null,
    })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let imageBase64: string

    if (buffer.length > 1_000_000) {
      const sharp = (await import('sharp')).default
      try {
        const resized = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer()
        if (resized.length > 1_000_000) {
          const smaller = await sharp(buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 60 })
            .toBuffer()
          imageBase64 = smaller.toString('base64')
        } else {
          imageBase64 = resized.toString('base64')
        }
      } catch {
        return NextResponse.json(errorResult('Image too large'), { status: 400 })
      }
    } else {
      imageBase64 = buffer.toString('base64')
    }

    // 20-second timeout per spec §8.1
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION' },
          ],
        }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.error('Vision API error:', await res.text())
      return NextResponse.json(errorResult('recognition_failed'))
    }

    const data = await res.json()
    const result = data.responses?.[0] ?? {}

    const labels: string[] = (result.labelAnnotations ?? [])
      .map((l: { description: string }) => l.description)

    const detectedText: string[] = (result.textAnnotations ?? [])
      .slice(0, 5)
      .map((t: { description: string }) => t.description)
      .filter((t: string) => t.length < 100)

    const webEntitiesRaw: { description?: string; score?: number }[] =
      result.webDetection?.webEntities ?? []

    // Filter to entities with score >= 0.7 per spec §8.1
    const filteredEntities = webEntitiesRaw.filter(
      (e) => e.description && (e.score ?? 0) >= 0.7
    )
    const webEntityNames = filteredEntities.map(e => e.description as string)

    const bestGuess: string | null =
      result.webDetection?.bestGuessLabels?.[0]?.label ?? webEntityNames[0] ?? null

    const topScore = filteredEntities.length > 0
      ? Math.max(...filteredEntities.map(e => e.score ?? 0))
      : 0

    // Second pass: use Claude for specific product identification
    const claudeResult = await identifyProductWithClaude(
      imageBase64,
      file.type || 'image/jpeg',
      labels,
      bestGuess
    )

    if (claudeResult) {
      // Claude identified a specific product — use its output
      const claudeCategory = mapToCategory(claudeResult.searchTerms, labels)
      return NextResponse.json({
        productName: claudeResult.productName,
        category: claudeCategory,
        confidence: Math.round(topScore * 100) / 100,
        searchTerms: claudeResult.searchTerms,
        visionLabels: [...labels, ...webEntityNames, ...detectedText],
        error: null,
      })
    }

    // If Claude fails or isn't configured, fall through to existing Vision-only logic below
    const category = mapToCategory(labels, webEntityNames)
    const searchTerms = bestGuess
      ? [bestGuess, ...webEntityNames.filter(n => n !== bestGuess)].slice(0, 5)
      : webEntityNames.slice(0, 5)

    if (bestGuess) {
      const guessLower = bestGuess.toLowerCase().trim()
      if (NON_PRODUCT_TERMS.includes(guessLower)) {
        return NextResponse.json({
          productName: null,
          category: null,
          confidence: 0,
          searchTerms: [],
          error: 'Could not identify a product. Try a clearer photo of a product with a visible label.',
        })
      }
    }

      return NextResponse.json({
        productName: bestGuess,
        category,
        confidence: Math.round(topScore * 100) / 100,
        searchTerms,
        visionLabels: [...labels, ...webEntityNames, ...detectedText],
        error: null,
      })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(errorResult('recognition_timeout'))
    }
    console.error('Vision route error:', err)
    return NextResponse.json(errorResult('recognition_failed'))
  }
}
