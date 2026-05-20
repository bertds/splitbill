import type { ParsedBill } from '../types';

export async function parseWithLocal(base64: string): Promise<ParsedBill> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, { logger: () => {} });

  try {
    const imageBuffer = Buffer.from(base64, 'base64');
    const { data: { text } } = await worker.recognize(imageBuffer);
    return parseReceiptText(text);
  } finally {
    await worker.terminate();
  }
}

function parseReceiptText(text: string): ParsedBill {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedBill['items'] = [];

  // Match lines like: "1 Lasagne 15.50" or "Lasagne 15,50" or "LASAGNE 15.50"
  const pricePattern = /^(\d+)?\s*(.{2,40}?)\s{2,}(\d+[.,]\d{2})\s*$/;
  const skipPattern = /total|totale|subtotal|tax|iva|service|coperto|sconto|discount|tip/i;

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
