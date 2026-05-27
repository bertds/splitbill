import type { Metadata } from 'next';
import { SessionClient } from '@/components/SessionClient';
import { getSupabaseServer } from '@/lib/supabase-server';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = getSupabaseServer();

  const [{ data: session }, { data: participants }, { data: results }] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', params.id).single(),
    supabase.from('participants').select('*').eq('session_id', params.id).order('created_at'),
    supabase.from('results').select('*').eq('session_id', params.id),
  ]);

  if (!session) {
    return { title: 'Session not found — SplitBill' };
  }

  const currency = session.currency || 'EUR';
  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  const title = session.restaurant_name
    ? `${session.restaurant_name} — SplitBill`
    : 'Bill Split — SplitBill';

  let description: string;
  if (session.status === 'calculated' && results?.length) {
    const participantMap = Object.fromEntries((participants ?? []).map((p) => [p.id, p.name]));
    const lines = results
      .sort((a, b) => b.total - a.total)
      .map((r) => `${participantMap[r.participant_id] ?? '?'}: ${fmt(r.total)}`);
    description = lines.join(' · ');
  } else {
    const names = (participants ?? []).map((p) => p.name);
    description = names.length
      ? `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''} are splitting the bill`
      : 'Open the link to join the bill split';
  }

  // OG image must be an absolute URL so WhatsApp/Telegram scrapers can fetch it
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'https://bill.ccstudios.be');
  const imageUrl = `${baseUrl}/api/og/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function SessionPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <SessionClient sessionId={params.id} />
      </div>
    </main>
  );
}
