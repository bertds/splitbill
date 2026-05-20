import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('participants')
    .insert({ session_id: params.id, name: name.trim() })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
