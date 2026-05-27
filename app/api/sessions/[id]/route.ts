import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServer();

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const [{ data: items }, { data: participants }, { data: claims }, { data: resultRows }] =
    await Promise.all([
      supabase.from('items').select('*').eq('session_id', params.id).order('name'),
      supabase.from('participants').select('*').eq('session_id', params.id).order('created_at'),
      supabase.from('item_claims').select('*').eq('session_id', params.id),
      supabase.from('results').select('*').eq('session_id', params.id),
    ]);

  const participantMap = Object.fromEntries((participants ?? []).map((p) => [p.id, p.name]));
  const results =
    session.status === 'calculated' && resultRows?.length
      ? resultRows.map((r) => ({
          participant_id: r.participant_id,
          name: participantMap[r.participant_id] ?? 'Unknown',
          line_items: r.breakdown ?? [],
          subtotal: r.subtotal,
          shared_cost: r.shared_cost,
          total: r.total,
        }))
      : null;

  return NextResponse.json({
    session,
    items: items ?? [],
    participants: participants ?? [],
    claims: claims ?? [],
    results,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServer();

  // Grab image URL before deleting
  const { data: session } = await supabase
    .from('sessions')
    .select('bill_image_url')
    .eq('id', params.id)
    .single();

  // Delete session — CASCADE removes items, participants, claims, results
  const { error } = await supabase.from('sessions').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }

  // Best-effort: remove bill image from Storage
  if (session?.bill_image_url) {
    try {
      const url = new URL(session.bill_image_url);
      const parts = url.pathname.split('/bill-images/');
      if (parts[1]) {
        await supabase.storage.from('bill-images').remove([decodeURIComponent(parts[1])]);
      }
    } catch { /* ignore */ }
  }

  return new NextResponse(null, { status: 204 });
}
