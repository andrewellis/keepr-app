'use client'

import { useRef, useState } from 'react'

type ScanState = 'idle' | 'preview' | 'processing' | 'result'

export default function ScanClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setScanState('preview')
  }

  function handleCameraCapture() {
    fileInputRef.current?.click()
  }

  function handleUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setScanState('preview')
    }
    input.click()
  }

  function handleProcess() {
    setScanState('processing')
    // Simulate processing delay — real OCR/AI call goes here in Session 4
    setTimeout(() => setScanState('result'), 1800)
  }

  function handleReset() {
    setPreviewUrl(null)
    setScanState('idle')
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground mb-1">Scan Product</h1>
      <p className="text-sm text-foreground-secondary mb-6">
        Take a photo or upload an image of a clothing or product tag.
      </p>

      {/* Hidden camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* IDLE STATE */}
      {scanState === 'idle' && (
        <div className="space-y-3">
          {/* Camera button */}
          <button
            onClick={handleCameraCapture}
            className="w-full bg-primary rounded-2xl p-6 flex flex-col items-center gap-3 hover:opacity-90 active:scale-[0.98] transition"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-base">Take Photo</p>
              <p className="text-white/70 text-xs mt-0.5">Photograph the item</p>
            </div>
          </button>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-primary active:scale-[0.98] transition"
          >
            <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center">
              <svg className="w-8 h-8 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-base">Upload Image</p>
              <p className="text-foreground-secondary text-xs mt-0.5">Choose from photo library</p>
            </div>
          </button>

          {/* Tips */}
          <div className="bg-surface border border-border rounded-2xl p-4 mt-2">
            <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Tips for best results</p>
            <ul className="space-y-1.5">
              {[
                'Lay the item flat on a neutral surface',
                'Ensure the tag or label is clearly visible',
                'Avoid shadows and glare',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-foreground-secondary">
                  <span className="text-primary mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* PREVIEW STATE */}
      {scanState === 'preview' && previewUrl && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Product preview"
              className="w-full object-contain max-h-96"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
            >
              Retake
            </button>
            <button
              onClick={handleProcess}
              className="flex-1 bg-primary rounded-xl py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Process Image
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING STATE */}
      {scanState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-border border-t-primary animate-spin" />
          <div className="text-center">
              <p className="text-foreground font-semibold">Processing image…</p>
              <p className="text-foreground-secondary text-sm mt-1">Extracting product data</p>
          </div>
        </div>
      )}

      {/* RESULT STATE — placeholder until Session 4 OCR */}
      {scanState === 'result' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">Product scanned</p>
                <p className="text-foreground-secondary text-xs">Review and confirm below</p>
              </div>
            </div>

            {/* Placeholder result fields */}
            <div className="space-y-3">
              {[
                { label: 'Brand', value: '—' },
                { label: 'Item', value: '—' },
                { label: 'Price', value: '—' },
                { label: 'Category', value: '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-foreground-secondary">{label}</span>
                  <span className="text-sm text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-foreground-secondary mt-4 text-center">
              Product data extraction coming in the next session.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
            >
              Scan Another Item
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-primary rounded-xl py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
