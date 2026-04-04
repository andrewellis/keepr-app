/**
 * Parse an Amazon Order History CSV export into tracked item candidates.
 * Amazon's export uses "Product Name" as the column header (verified).
 * Falls back to checking "Title" in case the schema varies by region.
 * Only items purchased 2+ times are returned — these are repeat purchases
 * worth tracking for price drops.
 */
export interface AmazonOrderRow {
  productName: string;
  orderDate: string;
  price: number | null;
  category: string;
}

export interface TrackedItemCandidate {
  title: string;
  searchQuery: string;
  purchaseCount: number;
  lastPurchasedAt: string;
  category: string;
}

export function parseAmazonCsv(csvText: string): TrackedItemCandidate[] {
  const lines = csvText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());

  const nameIdx = headers.indexOf('product name') !== -1
    ? headers.indexOf('product name')
    : headers.indexOf('title');
  const dateIdx = headers.indexOf('order date');
  const categoryIdx = headers.indexOf('category');

  if (nameIdx === -1) return [];

  const rows: AmazonOrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[nameIdx]?.trim();
    if (!name) continue;

    rows.push({
      productName: name,
      orderDate: cols[dateIdx]?.trim() ?? '',
      price: null,
      category: cols[categoryIdx]?.trim() ?? 'general',
    });
  }

  // Group by product name and count purchases
  const grouped = new Map<string, AmazonOrderRow[]>();
  for (const row of rows) {
    const key = row.productName.toLowerCase().trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const candidates: TrackedItemCandidate[] = [];

  grouped.forEach((purchases) => {
    if (purchases.length < 2) return; // Only repeat purchases

    const sorted = purchases.sort((a, b) =>
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

    const latest = sorted[0];
    candidates.push({
      title: latest.productName,
      searchQuery: latest.productName,
      purchaseCount: purchases.length,
      lastPurchasedAt: latest.orderDate,
      category: latest.category || 'general',
    });
  });

  return candidates;
}

/**
 * Minimal CSV line parser that handles quoted fields with commas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
