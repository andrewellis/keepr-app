import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'missing image' }, { status: 400 })
  console.log('File received:', file.name, file.type, file.size, 'bytes')

  // TEMP: mock vision response for development
  return NextResponse.json({ labels: ['Nicotine pouch', 'Tobacco product', 'Consumer goods'], webEntities: ['Velo Nicotine Pouches', 'Nordic Spirit', 'ZYN'], bestGuess: 'Velo nicotine pouches' })

  let imageBase64: string
  const buffer = Buffer.from(await file.arrayBuffer())

  // Resize if image is over 800KB to stay within Vision API limits
  if (buffer.length > 800000) {
    try {
      const jpegBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      imageBase64 = jpegBuffer.toString('base64')
    } catch {
      // If sharp fails, reject with a clear error instead of sending bad data
      return NextResponse.json({ error: 'Image too large. Please use a smaller image.' }, { status: 400 })
    }
  } else {
    imageBase64 = buffer.toString('base64')
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  console.log('API key present:', !!apiKey, 'length:', apiKey?.length)
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'WEB_DETECTION', maxResults: 5 },
          ],
        }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Vision API request failed' }, { status: 500 })
  }

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: 500 })
  }

  const data = await res.json()
  console.log('Vision response:', JSON.stringify(data, null, 2))
  const result = data.responses?.[0] ?? {}

  const labels: string[] = (result.labelAnnotations ?? []).map((l: { description: string }) => l.description)
  const webEntities: string[] = (result.webDetection?.webEntities ?? [])
    .map((e: { description?: string }) => e.description)
    .filter(Boolean)
  const bestGuess: string = result.webDetection?.bestGuessLabels?.[0]?.label ?? labels[0] ?? 'Unknown product'

  return NextResponse.json({ labels, webEntities, bestGuess })
}
