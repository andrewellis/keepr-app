import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { runPriceCheck } from '../../../../lib/price-tracker/serp-price-check';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOOKBACK_DAYS = 7;
const BATCH_SIZE = 50;

/**
 * Weekly cron: GET /api/cron/price-check
 * Checks prices for all active tracked items not checked in the last 7 days.
 * Writes results to price_checks table and generates price_alerts when
 * a new price is below the item's historical minimum.
 * Protected by CRON_SECRET bearer token.
 * Processes in batches of 50 to avoid timeouts.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const { data: items, error: fetchError } = await supabase
    .from('tracked_items')
    .select('id, user_id, search_query, category, min_observed_price')
    .eq('is_active', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff.toISOString()}`)
    .limit(BATCH_SIZE);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, alerts: 0 });
  }

  let checked = 0;
  let alerts = 0;

  for (const item of items) {
    try {
      const result = await runPriceCheck(item.search_query, item.category);

      // Mark as checked regardless of result
      await supabase
        .from('tracked_items')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', item.id);

      if (!result || result.price === null) continue;

      // Write price_check record
      await supabase.from('price_checks').insert({
        tracked_item_id: item.id,
        engine: result.engine,
        retailer_domain: result.retailerDomain,
        title: result.title,
        price: result.price,
        currency: result.currency,
        url: result.url,
        is_new_condition: result.isNewCondition,
      });

      checked++;

      // Generate alert if price is below historical minimum
      const isNewMin =
        item.min_observed_price === null ||
        result.price < item.min_observed_price;

      if (isNewMin) {
        await supabase.from('price_alerts').insert({
          user_id: item.user_id,
          tracked_item_id: item.id,
          previous_best_price: item.min_observed_price,
          new_best_price: result.price,
          retailer_domain: result.retailerDomain,
          url: result.url,
          savings_amount:
            item.min_observed_price !== null
              ? item.min_observed_price - result.price
              : null,
          is_read: false,
        });

        await supabase
          .from('tracked_items')
          .update({ min_observed_price: result.price })
          .eq('id', item.id);

        alerts++;
      }
    } catch (err) {
      console.error(`price-check failed for item ${item.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, checked, alerts });
}
