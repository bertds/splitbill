import path from 'path';
import type { ParsedBill } from '../types';

// Use tessdata bundled in the image (see Dockerfile), fall back to CDN
const TESSDATA_DIR =
  process.env.TESSDATA_PATH ?? path.join(process.cwd(), 'tessdata');

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function parseWithLocal(base64: string): Promise<ParsedBill> {
  const { createWorker } = await import('tesseract.js');

  const worker = await withTimeout(
    createWorker('eng', 1, {
      logger: () => {},
      langPath: TESSDATA_DIR,
      cachePath: '/tmp/tessdata',
    }),
    60_000,
    'Tesseract worker init'
  );

  try {
    const imageBuffer = Buffer.from(base64, 'base64');
    const {
      data: { text },
    } = await withTimeout(
      worker.recognize(imageBuffer),
      60_000,
      'Tesseract recognition'
    );
    return parseReceiptText(text);
  } finally {
    await worker.terminate().catch(() => {});
  }
}

function parseReceiptText(text: string): ParsedBill {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedBill['items'] = [];

  // Match lines like: "1 Lasagne 15.50" or "Lasagne 15,50" or "LASAGNE 15.50"
  const pricePattern = /^(\d+)?\s*(.{2,40}?)\s{2,}(\d+[.,]\d{2})\s*$/;
  const skipPattern =
    /total|totale|subtotal|tax|iva|service|coperto|sconto|discount|tip/i;

  for (const line of lines) {
    if (skipPattern.test(line)) continue;
    const match = line.match(pricePattern);
    if (!match) continue;

    const quantity = match[1] ? parseInt(match[1]) : 1;
    const name = match[2].trim().replace(/\s+/g, ' ');
    const price = parseFloat(match[3].replace(',', '.'));

    if (price <= 0 || price > 1000 || name.length < 2) continue;

    items.push({
      name,
      quantity,
      unit_price: price / quantity,
      total_price: price,
    });
  }

  const total = items.reduce((s, i) => s + i.total_price, 0);
  return { restaurant_name: null, currency: 'EUR', items, total };
}
