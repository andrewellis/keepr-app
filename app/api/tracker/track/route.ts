import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : null;
}

const AGGRESSIVE_ELIGIBLE_CATEGORIES = [
  'electronics',
  'appliances',
  'gaming',
  'furniture',
];

/**
 * POST /api/tracker/track
 * Adds an item to the price tracker from scan results.
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

  // Parse body
  let body: {
    productName: string;
    price: number;
    category: string;
    retailerDomain: string;
    url: string;
    aggressive: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { productName, price, category, retailerDomain, url, aggressive } =
    body;

  if (
    productName === undefined ||
    price === undefined ||
    category === undefined ||
    retailerDomain === undefined ||
    url === undefined ||
    aggressive === undefined
  ) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // STEP 1 — Eligibility check for aggressive tracking
  const isEligibleForAggressive =
    price >= 100 ||
    AGGRESSIVE_ELIGIBLE_CATEGORIES.includes(category.toLowerCase());

  if (aggressive && !isEligibleForAggressive) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Available for items over $100 or electronics, appliances, gaming, or furniture',
      },
      { status: 400 }
    );
  }

  // Use service-role client for profile reads/writes and upserts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // STEP 2 — Monthly limit enforcement for aggressive tracking
  let profile: {
    aggressive_track_count: number | null;
    aggressive_track_reset_at: string | null;
  } | null = null;

  if (aggressive) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('aggressive_track_count, aggressive_track_reset_at')
      .eq('id', user.id)
      .single();

    profile = profileData;

    // Check if reset is needed (null or previous calendar month)
    const now = new Date();
    const resetAt = profile?.aggressive_track_reset_at
      ? new Date(profile.aggressive_track_reset_at)
      : null;

    const needsReset =
      !resetAt ||
      resetAt.getFullYear() < now.getFullYear() ||
      (resetAt.getFullYear() === now.getFullYear() &&
        resetAt.getMonth() < now.getMonth());

    if (needsReset) {
      await supabase
        .from('profiles')
        .update({
          aggressive_track_count: 0,
          aggressive_track_reset_at: now.toISOString(),
        })
        .eq('id', user.id);

      profile = {
        aggressive_track_count: 0,
        aggressive_track_reset_at: now.toISOString(),
      };
    }

    if ((profile?.aggressive_track_count ?? 0) >= 3) {
      return NextResponse.json(
        { success: false, message: 'Monthly limit reached (3/3)' },
        { status: 400 }
      );
    }
  }

  // STEP 3 — Upsert to tracked_items
  const { error: upsertError } = await supabase
    .from('tracked_items')
    .upsert(
      {
        user_id: user.id,
        title: productName,
        search_query: productName,
        category,
        aggressive,
        asin: extractAsin(url) ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,search_query' }
    );

  if (upsertError) {
    return NextResponse.json(
      { success: false, message: 'Failed to save tracked item' },
      { status: 500 }
    );
  }

  // STEP 4 — Increment aggressive_track_count if aggressive
  if (aggressive) {
    await supabase
      .from('profiles')
      .update({
        aggressive_track_count: (profile?.aggressive_track_count ?? 0) + 1,
        aggressive_track_reset_at:
          profile?.aggressive_track_reset_at ?? new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  // STEP 5 — Return success response
  return NextResponse.json({
    success: true,
    message: aggressive ? 'Aggressively tracking' : 'Tracking',
    aggressive_remaining: aggressive
      ? 3 - ((profile?.aggressive_track_count ?? 0) + 1)
      : null,
  });
}

// Suppress unused-variable warnings for fields validated but not stored
void ((_: string) => _);
