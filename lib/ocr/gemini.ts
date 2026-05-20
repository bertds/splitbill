import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParsedBill } from '../types';

const PROMPT = `Analyze this restaurant receipt image and return ONLY a valid JSON object — no markdown, no explanation.

Required format:
{"restaurant_name":"string or null","currency":"EUR","total":0.00,"items":[{"name":"string","quantity":1,"unit_price":0.00,"total_price":0.00}]}

Rules:
- Include every individual food/drink line item
- Use the quantity number shown on the receipt
- unit_price = price per single item, total_price = unit_price × quantity
- Do NOT include totals, subtotals, tax, or service charge lines`;

export async function parseWithGemini(base64: string, mimeType: string): Promise<ParsedBill> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    PROMPT,
  ]);

  const text = result.response.text();
  const stripped = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Gemini response');
  return JSON.parse(match[0]);
}
