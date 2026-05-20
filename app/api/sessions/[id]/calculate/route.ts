import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { calculateSplit } from '@/lib/calculate';

export async function POST(
  _request: NextRequest,
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

  const [{ data: items }, { data: participants }, { data: claims }] = await Promise.all([
    supabase.from('items').select('*').eq('session_id', params.id),
    supabase.from('participants').select('*').eq('session_id', params.id),
    supabase.from('item_claims').select('*').eq('session_id', params.id),
  ]);

  const results = calculateSplit(items ?? [], participants ?? [], claims ?? []);

  if (results.length > 0) {
    await supabase.from('results').insert(
      results.map((r) => ({
        session_id: params.id,
        participant_id: r.participant_id,
        subtotal: r.subtotal,
        shared_cost: r.shared_cost,
        total: r.total,
        breakdown: r.line_items,
      }))
    );
  }

  await supabase.from('sessions').update({ status: 'calculated' }).eq('id', params.id);

  return NextResponse.json({ results });
}
