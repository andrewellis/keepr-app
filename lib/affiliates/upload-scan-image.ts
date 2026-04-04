import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Upload a scan image (as a Buffer or Blob) to the product-scans
 * Supabase Storage bucket. Returns the public URL on success, null on failure.
 * Files are stored under a timestamped path to avoid collisions.
 * The cleanup cron at /api/cron/cleanup-scans deletes files older than 1 hour.
 */
export async function uploadScanImage(
  imageData: Buffer | Blob,
  mimeType: string = 'image/jpeg'
): Promise<string | null> {
  const timestamp = Date.now();
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `scans/${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from('product-scans')
    .upload(path, imageData, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('uploadScanImage error:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('product-scans')
    .getPublicUrl(path);

  return data.publicUrl ?? null;
}
