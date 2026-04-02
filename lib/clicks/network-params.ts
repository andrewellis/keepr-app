/**
 * Maps retailer names to their affiliate network's Click ID URL parameter.
 * Used to append tracking IDs to affiliate links before returning them to the frontend.
 */
export const CLICK_ID_PARAMS: Record<string, string> = {
  Amazon: 'ascsubtag',
  CJ: 'sid',
  Impact: 'irclickid',
  Rakuten: 'u1',
  Awin: 'clickref',
}

/**
 * Appends a Click ID to an affiliate URL using the correct network-specific parameter.
 *
 * @param url - The affiliate URL to modify
 * @param retailer - The retailer/network name (used to look up the correct param)
 * @param clickId - The Click ID to append
 * @returns The modified URL with the Click ID appended
 */
export function appendClickIdToUrl(
  url: string,
  retailer: string,
  clickId: string
): string {
  // Normalize retailer name: strip parenthetical suffixes like "(CJ)", "(Rakuten)", etc.
  // e.g. "Nike (CJ)" → look up "CJ", "Macy's (Rakuten)" → look up "Rakuten"
  let param = CLICK_ID_PARAMS[retailer]

  if (!param) {
    // Try to extract network name from parenthetical suffix
    const parenMatch = retailer.match(/\(([^)]+)\)$/)
    if (parenMatch) {
      const networkName = parenMatch[1].trim()
      param = CLICK_ID_PARAMS[networkName]
    }
  }

  if (!param) {
    console.warn(
      `[clicks] No Click ID param found for retailer "${retailer}". Falling back to "subid".`
    )
    param = 'subid'
  }

  // Append the parameter — use & since affiliate URLs typically already have query params
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${param}=${encodeURIComponent(clickId)}`
}
