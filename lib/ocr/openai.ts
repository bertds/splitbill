import type { ParsedBill } from '../types';

const PROMPT = `Analyze this restaurant receipt image and return ONLY a valid JSON object — no markdown, no explanation.

Required format:
{"restaurant_name":"string or null","currency":"EUR","total":0.00,"items":[{"name":"string","quantity":1,"unit_price":0.00,"total_price":0.00}]}

Rules:
- Include every individual food/drink line item
- Use the quantity number shown on the receipt
- unit_price = price per single item, total_price = unit_price × quantity
- Do NOT include totals, subtotals, tax, or service charge lines`;

export async function parseWithOpenAI(base64: string, mimeType: string, apiKey: string): Promise<ParsedBill> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const stripped = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in OpenAI response');
  return JSON.parse(match[0]);
}
