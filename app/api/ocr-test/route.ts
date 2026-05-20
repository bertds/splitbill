import { NextRequest, NextResponse } from 'next/server';
import type { OcrProvider } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  const provider = (formData.get('provider') as string) || 'claude';

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  // Allow API keys from request headers (set by client from localStorage)
  const anthropicKey = request.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY;
  const googleKey = request.headers.get('x-google-key') || process.env.GOOGLE_API_KEY;
  const openaiKey = request.headers.get('x-openai-key') || process.env.OPENAI_API_KEY;

  try {
    let parsed;

    if (provider === 'claude') {
      if (!anthropicKey) throw new Error('No Anthropic API key configured');
      process.env.ANTHROPIC_API_KEY = anthropicKey;
      const { parseWithClaude } = await import('@/lib/ocr/claude');
      parsed = await parseWithClaude(base64, mimeType);
    } else if (provider === 'gemini') {
      if (!googleKey) throw new Error('No Google API key configured');
      process.env.GOOGLE_API_KEY = googleKey;
      const { parseWithGemini } = await import('@/lib/ocr/gemini');
      parsed = await parseWithGemini(base64, mimeType);
    } else if (provider === 'openai') {
      if (!openaiKey) throw new Error('No OpenAI API key configured');
      const { parseWithOpenAI } = await import('@/lib/ocr/openai');
      parsed = await parseWithOpenAI(base64, mimeType, openaiKey);
    } else {
      const { parseWithLocal } = await import('@/lib/ocr/local');
      parsed = await parseWithLocal(base64);
    }

    // Expand multi-quantity items
    const expandedItems = parsed.items.flatMap((item) =>
      Array.from({ length: Math.max(1, item.quantity ?? 1) }, () => ({
        name: item.name,
        price: item.unit_price,
      }))
    );

    return NextResponse.json({
      provider,
      restaurant_name: parsed.restaurant_name,
      currency: parsed.currency || 'EUR',
      total: parsed.total,
      items: expandedItems,
      raw_item_count: expandedItems.length,
    });
  } catch (e) {
    return NextResponse.json(
      { provider, error: e instanceof Error ? e.message : 'Parse failed' },
      { status: 500 }
    );
  }
}
