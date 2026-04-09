export type BuyTimingVerdict = 'good' | 'fair' | 'consider-waiting'

export function getBuyTiming(percentVsAvg90: number | null): BuyTimingVerdict | null {
  if (percentVsAvg90 === null) return null
  if (percentVsAvg90 < -5) return 'good'
  if (percentVsAvg90 <= 5) return 'fair'
  return 'consider-waiting'
}

export function getBuyTimingColor(verdict: BuyTimingVerdict): string {
  switch (verdict) {
    case 'good': return '#1D9E75'
    case 'fair': return '#1a1a1a'
    case 'consider-waiting': return '#D85A30'
  }
}

export function getBuyTimingLabel(verdict: BuyTimingVerdict): string {
  switch (verdict) {
    case 'good': return 'Good time to buy'
    case 'fair': return 'Fair price'
    case 'consider-waiting': return 'Consider waiting'
  }
}
