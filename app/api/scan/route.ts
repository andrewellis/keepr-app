import { NextRequest, NextResponse } from 'next/server'

interface ScanResult {
  productName: string | null
  category: string | null
  confidence: number
  searchTerms: string[]
  error: string | null
}

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

    // 10-second timeout per spec §8.1
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

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

    const category = mapToCategory(labels, webEntityNames)
    const searchTerms = bestGuess
      ? [bestGuess, ...webEntityNames.filter(n => n !== bestGuess)].slice(0, 5)
      : webEntityNames.slice(0, 5)

    return NextResponse.json({
      productName: bestGuess,
      category,
      confidence: Math.round(topScore * 100) / 100,
      searchTerms,
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
