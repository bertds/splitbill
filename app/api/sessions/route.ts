import { NextRequest, NextResponse } from 'next/server';
import { parseBill } from '@/lib/ocr/index';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { OcrProvider } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  const provider = ((formData.get('provider') as string) || 'claude') as OcrProvider;

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  let parsed;
  try {
    parsed = await parseBill(base64, mimeType, provider);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse bill: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  // Expand items with quantity > 1 into individual rows at unit price
  const expandedItems = parsed.items.flatMap((item) =>
    Array.from({ length: Math.max(1, item.quantity ?? 1) }, () => ({
      name: item.name,
      price: item.unit_price,
      shared: false,
    }))
  );

  const supabase = getSupabaseServer();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      restaurant_name: parsed.restaurant_name,
      currency: parsed.currency || 'EUR',
      total: parsed.total,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Session error:', sessionError);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  if (expandedItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('items')
      .insert(expandedItems.map((item) => ({ ...item, session_id: session.id })));

    if (itemsError) {
      console.error('Items error:', itemsError);
      return NextResponse.json({ error: 'Failed to save items' }, { status: 500 });
    }
  }

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
