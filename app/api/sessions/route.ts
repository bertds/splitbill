import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { OcrProvider } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  const provider = ((formData.get('provider') as string) || 'claude') as OcrProvider;

  // Support pre-parsed items from the compare flow (skip OCR)
  const preItems = formData.get('items');
  const restaurantName = formData.get('restaurant_name') as string | null;
  const currency = (formData.get('currency') as string) || 'EUR';
  const total = formData.get('total') ? parseFloat(formData.get('total') as string) : null;

  // Allow API keys from request headers (set by client from localStorage)
  const anthropicKey = request.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY;
  const googleKey = request.headers.get('x-google-key') || process.env.GOOGLE_API_KEY;
  const openaiKey = request.headers.get('x-openai-key') || process.env.OPENAI_API_KEY;
  if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey;
  if (googleKey) process.env.GOOGLE_API_KEY = googleKey;
  if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;

  let expandedItems: { name: string; price: number; shared: boolean }[];
  let parsedRestaurantName = restaurantName;
  let parsedCurrency = currency;
  let parsedTotal = total;

  if (preItems) {
    // Items already parsed by the compare flow — just use them
    const parsed = JSON.parse(preItems as string) as { name: string; price: number }[];
    expandedItems = parsed.map((i) => ({ name: i.name, price: i.price, shared: false }));
  } else {
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let parsed;
    try {
      const { parseBill } = await import('@/lib/ocr/index');
      parsed = await parseBill(base64, mimeType, provider);
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to parse bill: ${e instanceof Error ? e.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    expandedItems = parsed.items.flatMap((item) =>
      Array.from({ length: Math.max(1, item.quantity ?? 1) }, () => ({
        name: item.name,
        price: item.unit_price,
        shared: false,
      }))
    );
    parsedRestaurantName = parsed.restaurant_name;
    parsedCurrency = parsed.currency || 'EUR';
    parsedTotal = parsed.total;
  }

  const supabase = getSupabaseServer();

  // Upload bill image to Supabase Storage
  let billImageUrl: string | null = null;
  if (file) {
    try {
      const ext = file.type.split('/')[1] || 'jpg';
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('bill-images')
        .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('bill-images').getPublicUrl(path);
        billImageUrl = urlData.publicUrl;
      }
    } catch {
      // Image upload is best-effort — don't fail the whole request
    }
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      restaurant_name: parsedRestaurantName || null,
      currency: parsedCurrency,
      total: parsedTotal || null,
      bill_image_url: billImageUrl,
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
