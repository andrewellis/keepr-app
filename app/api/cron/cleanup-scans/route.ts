import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Hourly cron: delete scan images older than 1 hour from product-scans bucket
 * and expired rows from search_cache.
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { deletedImages: 0, deletedCacheRows: 0, errors: [] as string[] };

  // Delete scan images older than 1 hour
  try {
    const { data: files, error: listError } = await supabase.storage
      .from('product-scans')
      .list('scans');

    if (listError) {
      results.errors.push(`list error: ${listError.message}`);
    } else if (files && files.length > 0) {
      const cutoff = Date.now() - 60 * 60 * 1000;
      const oldFiles = files.filter(f => {
        const ts = parseInt(f.name.split('.')[0], 10);
        return !isNaN(ts) && ts < cutoff;
      });

      if (oldFiles.length > 0) {
        const paths = oldFiles.map(f => `scans/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from('product-scans')
          .remove(paths);

        if (deleteError) {
          results.errors.push(`delete error: ${deleteError.message}`);
        } else {
          results.deletedImages = oldFiles.length;
        }
      }
    }
  } catch (err) {
    results.errors.push(`images exception: ${String(err)}`);
  }

  // Delete expired search_cache rows
  try {
    const { error: cacheError } = await supabase
      .from('search_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cacheError) {
      results.errors.push(`cache cleanup error: ${cacheError.message}`);
    } else {
      results.deletedCacheRows = 1; // Supabase doesn't return count on delete
    }
  } catch (err) {
    results.errors.push(`cache exception: ${String(err)}`);
  }

  return NextResponse.json({ ok: true, ...results });
}
