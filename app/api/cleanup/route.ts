import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// Called by a cron job: GET /api/cleanup?secret=<CLEANUP_SECRET>&months=6
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const months = parseInt(request.nextUrl.searchParams.get('months') || '6', 10);

  if (!process.env.CLEANUP_SECRET || secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  // Collect image URLs before deleting
  const { data: old } = await supabase
    .from('sessions')
    .select('id, bill_image_url')
    .lt('created_at', cutoff.toISOString());

  if (!old?.length) {
    return NextResponse.json({ deleted: 0, message: 'Nothing to clean up' });
  }

  // Delete sessions (CASCADE handles the rest)
  const ids = old.map((s) => s.id);
  const { error } = await supabase.from('sessions').delete().in('id', ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove bill images from Storage
  const imagePaths = old
    .map((s) => {
      if (!s.bill_image_url) return null;
      try {
        const url = new URL(s.bill_image_url);
        const parts = url.pathname.split('/bill-images/');
        return parts[1] ? decodeURIComponent(parts[1]) : null;
      } catch { return null; }
    })
    .filter(Boolean) as string[];

  if (imagePaths.length > 0) {
    await supabase.storage.from('bill-images').remove(imagePaths);
  }

  return NextResponse.json({
    deleted: ids.length,
    imagesRemoved: imagePaths.length,
    cutoff: cutoff.toISOString(),
  });
}
