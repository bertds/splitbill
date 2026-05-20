import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { itemId, participantId } = await request.json();
  if (!itemId || !participantId) {
    return NextResponse.json({ error: 'itemId and participantId required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Verify participant belongs to this session
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('session_id', params.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: 'Participant not in session' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('item_claims')
    .upsert({ item_id: itemId, participant_id: participantId, session_id: params.id })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const participantId = searchParams.get('participantId');

  if (!itemId || !participantId) {
    return NextResponse.json({ error: 'itemId and participantId required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  await supabase
    .from('item_claims')
    .delete()
    .eq('item_id', itemId)
    .eq('participant_id', participantId)
    .eq('session_id', params.id);

  return NextResponse.json({ ok: true });
}
