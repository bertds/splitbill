import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * POST /api/sessions/[id]/reopen
 * Deletes existing results and sets the session back to 'open' so participants
 * can adjust their claims and the coordinator can recalculate.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServer();

  // Delete existing results
  await supabase.from('results').delete().eq('session_id', params.id);

  // Reset status to open
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'open' })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to reopen session' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
