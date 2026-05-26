import type { ParsedBill, OcrProvider } from '../types';

export async function parseBill(
  base64: string,
  mimeType: string,
  provider: OcrProvider
): Promise<ParsedBill> {
  switch (provider) {
    case 'claude': {
      const { parseWithClaude } = await import('./claude');
      return parseWithClaude(base64, mimeType);
    }
    case 'gemini': {
      const { parseWithGemini } = await import('./gemini');
      return parseWithGemini(base64, mimeType);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('No OpenAI API key configured');
      const { parseWithOpenAI } = await import('./openai');
      return parseWithOpenAI(base64, mimeType, apiKey);
    }
    case 'local': {
      const { parseWithLocal } = await import('./local');
      return parseWithLocal(base64);
    }
  }
}
