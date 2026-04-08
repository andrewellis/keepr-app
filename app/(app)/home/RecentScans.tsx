'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScanItem {
  id: string
  product_name: string
  created_at: string
  topResults: { price: string; source: string; priceNum: number }[]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function cleanDomain(raw: string): string {
  return raw
    .replace(/^www\./i, '')
    .replace(/\.(com|co\.uk|org|net|co)$/i, '')
    .replace(/^./, c => c.toUpperCase())
}

export default function RecentScans({ scans }: { scans: ScanItem[] }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? scans : scans.slice(0, 4)

  return (
    <>
      <div className="mx-5 mt-4 flex items-center justify-between">
        <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          RECENT SCANS
        </p>
        {scans.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: '11px', color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? 'Show less' : 'See all'}
          </button>
        )}
      </div>
      <div className="bg-white border border-border rounded-2xl mx-5" style={{ marginTop: '8px', maxHeight: expanded ? '60vh' : 'none', overflowY: expanded ? 'auto' : 'hidden', borderRadius: '16px', WebkitOverflowScrolling: 'touch' }}>
        {visible.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p style={{ fontSize: '12px', color: '#aaa' }}>No scans yet</p>
          </div>
        ) : (
          visible.map((scan, i) => {
            const isLast = i === visible.length - 1
            return (
              <div
                key={scan.id}
                onClick={() => router.push(`/scan?resume=${scan.id}`)}
                style={{ borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0', cursor: 'pointer' }}
              >
                <div className="flex items-center gap-2 px-3" style={{ paddingTop: '10px', paddingBottom: scan.topResults.length > 0 ? '4px' : '10px' }}>
                  <div className="flex-shrink-0" style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#534AB7' }} />
                  <p className="flex-1 min-w-0 truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>
                    {scan.product_name}
                  </p>
                  <p className="flex-shrink-0" style={{ fontSize: '10px', color: '#ccc' }}>
                    {relativeTime(scan.created_at)}
                  </p>
                </div>
                {scan.topResults.length > 0 && (
                  <div style={{ paddingLeft: '22px', paddingRight: '12px', paddingBottom: '8px' }}>
                    {scan.topResults.map((r, j) => (
                      <div key={j} className="flex items-center justify-between" style={{ paddingTop: '3px', paddingBottom: '3px', borderBottom: j < scan.topResults.length - 1 ? '0.5px solid #f5f5f5' : 'none' }}>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>{cleanDomain(r.source)}</span>
                        <div className="flex items-center gap-1">
                          {j === 0 && <span style={{ fontSize: '10px', backgroundColor: '#534AB7', color: '#fff', borderRadius: '2px', padding: '1px 4px' }}>Best</span>}
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{r.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
