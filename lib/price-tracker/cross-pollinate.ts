import { createClient } from '@supabase/supabase-js';
import type { SerpResult } from '../search/serp-multi-search';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cross-pollination: when a live scan returns results, check if any result
 * matches another user's tracked item at a price below their historical minimum.
 * If so, write a passive price alert for that user.
 *
 * This runs fire-and-forget from the match route — it must never throw
 * or block the scan response. All errors are caught and logged only.
 *
 * Uses pg_trgm fuzzy matching via the find_matching_tracked_items RPC.
 * Zero additional SerpApi calls — reuses scan results already in memory.
 */
export async function crossPollinate(
  scanResults: SerpResult[],
  scanningUserId: string | null
): Promise<void> {
  try {
    for (const result of scanResults) {
      if (!result.price || !result.title) continue;

      // Find tracked items from other users with similar titles
      const { data: matches, error } = await supabase.rpc(
        'find_matching_tracked_items',
        {
          search_text: result.title,
          similarity_threshold: 0.3,
          exclude_user_id: scanningUserId,
        }
      );

      if (error || !matches) continue;

      for (const match of matches as {
        id: string;
        user_id: string;
        search_query: string;
        min_observed_price: number | null;
        max_observed_price: number | null;
      }[]) {
        // Only alert if this price is below the tracked minimum
        if (
          match.min_observed_price !== null &&
          result.price >= match.min_observed_price
        ) {
          continue;
        }

        // Write passive alert
        await supabase.from('price_alerts').insert({
          user_id: match.user_id,
          tracked_item_id: match.id,
          previous_best_price: match.min_observed_price,
          new_best_price: result.price,
          retailer_domain: result.retailerDomain,
          url: result.url,
          savings_amount:
            match.min_observed_price !== null
              ? match.min_observed_price - result.price
              : null,
          is_read: false,
        });

        // Update min_observed_price on the tracked item
        await supabase
          .from('tracked_items')
          .update({ min_observed_price: result.price })
          .eq('id', match.id)
          .gt('min_observed_price', result.price);
      }
    }
  } catch (err) {
    console.error('crossPollinate error (non-fatal):', err);
  }
}
