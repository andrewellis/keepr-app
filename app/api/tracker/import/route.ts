import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { parseAmazonCsv } from '../../../../lib/price-tracker/parse-amazon-csv';
import { inferCategory } from '../../../../lib/search/engine-selector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/tracker/import
 * Accepts a multipart form upload with a single "file" field containing
 * an Amazon Order History CSV. Parses repeat-purchase items and upserts
 * them into tracked_items for the authenticated user.
 * Returns { imported: number } on success.
 */
export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse multipart form
  let csvText: string;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a .csv' },
        { status: 400 }
      );
    }
    csvText = await file.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 });
  }

  const candidates = parseAmazonCsv(csvText);
  if (candidates.length === 0) {
    return NextResponse.json({ imported: 0 });
  }

  let imported = 0;

  for (const candidate of candidates) {
    const category = inferCategory(candidate.title);
    const { error } = await supabase.from('tracked_items').upsert(
      {
        user_id: user.id,
        title: candidate.title,
        search_query: candidate.searchQuery,
        category,
        purchase_count: candidate.purchaseCount,
        last_purchased_at: candidate.lastPurchasedAt || null,
        is_active: true,
      },
      { onConflict: 'user_id,search_query' }
    );

    if (!error) imported++;
  }

  return NextResponse.json({ imported });
}
