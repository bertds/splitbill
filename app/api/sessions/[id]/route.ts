import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

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

  const [{ data: items }, { data: participants }, { data: claims }] = await Promise.all([
    supabase.from('items').select('*').eq('session_id', params.id).order('name'),
    supabase.from('participants').select('*').eq('session_id', params.id).order('created_at'),
    supabase.from('item_claims').select('*').eq('session_id', params.id),
  ]);

  return NextResponse.json({
    session,
    items: items ?? [],
    participants: participants ?? [],
    claims: claims ?? [],
  });
}
