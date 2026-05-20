import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const { shared } = await request.json();
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from('items')
    .update({ shared: Boolean(shared) })
    .eq('id', params.itemId)
    .eq('session_id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }

  return NextResponse.json(data);
}
