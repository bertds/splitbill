import { NextResponse } from 'next/server';

// Tells the client which providers are configured server-side.
// Returns booleans only — never exposes the actual key values.
export async function GET() {
  return NextResponse.json({
    claude: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GOOGLE_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  });
}
