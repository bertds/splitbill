import { ImageResponse } from 'next/og';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const W = 1200;
const H = 630;

function fmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseServer();

  const [{ data: session }, { data: participants }, { data: results }] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', params.id).single(),
    supabase.from('participants').select('*').eq('session_id', params.id).order('created_at'),
    supabase.from('results').select('*').eq('session_id', params.id),
  ]);

  if (!session) {
    return new Response('Not found', { status: 404 });
  }

  const currency = session.currency || 'EUR';
  const isCalculated = session.status === 'calculated' && results?.length;
  const title = session.restaurant_name || 'Bill Split';

  // Map results to names
  const participantMap = Object.fromEntries((participants ?? []).map((p) => [p.id, p.name]));
  const rows = isCalculated
    ? (results ?? []).map((r) => ({ name: participantMap[r.participant_id] ?? '?', total: r.total }))
        .sort((a, b) => b.total - a.total)
    : (participants ?? []).map((p) => ({ name: p.name, total: null }));

  const grandTotal = isCalculated
    ? (results ?? []).reduce((s, r) => s + r.total, 0)
    : session.total;

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #f5f0ff 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '60px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: '#4f46e5',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: 'white',
          }}>
            🧾
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{title}</span>
            <span style={{ fontSize: 18, color: '#6b7280', marginTop: 4 }}>
              {isCalculated ? '✅ Split calculated' : `${participants?.length ?? 0} people joining`}
              {grandTotal ? ` · Total ${fmt(grandTotal, currency)}` : ''}
            </span>
          </div>
        </div>

        {/* Participants / results grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1, alignContent: 'flex-start',
        }}>
          {rows.slice(0, 8).map((r, i) => (
            <div
              key={i}
              style={{
                background: i === 0 && isCalculated ? '#4f46e5' : 'white',
                border: '2px solid',
                borderColor: i === 0 && isCalculated ? '#4f46e5' : '#e5e7eb',
                borderRadius: 16,
                padding: '18px 24px',
                display: 'flex', flexDirection: 'column', gap: 4,
                minWidth: 200,
              }}
            >
              <span style={{
                fontSize: 22, fontWeight: 700,
                color: i === 0 && isCalculated ? 'white' : '#111827',
              }}>
                {r.name}
              </span>
              {r.total != null && (
                <span style={{
                  fontSize: 28, fontWeight: 800,
                  color: i === 0 && isCalculated ? 'rgba(255,255,255,0.9)' : '#4f46e5',
                }}>
                  {fmt(r.total, currency)}
                </span>
              )}
            </div>
          ))}
          {rows.length > 8 && (
            <div style={{
              background: '#f3f4f6', borderRadius: 16,
              padding: '18px 24px', display: 'flex', alignItems: 'center',
              fontSize: 22, color: '#6b7280', fontWeight: 600,
            }}>
              +{rows.length - 8} more
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 16, color: '#9ca3af' }}>bill.ccstudios.be</span>
          <span style={{
            fontSize: 16, fontWeight: 700, color: '#4f46e5',
            background: '#ede9fe', borderRadius: 100, padding: '6px 16px',
          }}>
            SplitBill
          </span>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
