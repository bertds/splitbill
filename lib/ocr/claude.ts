import Anthropic from '@anthropic-ai/sdk';
import type { ParsedBill } from '../types';

const PROMPT = `Analyze this restaurant receipt image and return ONLY a valid JSON object — no markdown, no explanation.

Required format:
{"restaurant_name":"string or null","currency":"EUR","total":0.00,"items":[{"name":"string","quantity":1,"unit_price":0.00,"total_price":0.00}]}

Rules:
- Include every individual food/drink line item
- Use the quantity number shown on the receipt (e.g. "9 Pane Coperto" → quantity: 9)
- unit_price = price per single item
- total_price = unit_price × quantity
- Do NOT include totals, subtotals, tax, or service charge lines as items`;

export async function parseWithClaude(base64: string, mimeType: string): Promise<ParsedBill> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: base64,
            },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });

  const text = msg.content.find((c) => c.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text response from Claude');
  return extractJson(text.text);
}

function extractJson(raw: string): ParsedBill {
  const stripped = raw.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in Claude response');
  return JSON.parse(match[0]);
}
