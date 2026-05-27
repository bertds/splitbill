'use client';

import { useEffect, useRef, useState } from 'react';
import { Calculator, Loader2, Users, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { JoinDialog } from './JoinDialog';
import { ItemsList } from './ItemsList';
import { ParticipantsList } from './ParticipantsList';
import { ResultsView } from './ResultsView';
import { ShareButton } from './ShareButton';
import type { Session, SessionItem, Participant, ItemClaim, CalculationResult } from '@/lib/types';

interface Props {
  sessionId: string;
}

export function SessionClient({ sessionId }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [results, setResults] = useState<CalculationResult[] | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const sessionItemIds = useRef<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    const stored = localStorage.getItem(`participant_${sessionId}`);
    setParticipantId(stored);
    setIsCoordinator(!!localStorage.getItem(`coordinator_${sessionId}`));

    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setSession(data.session);
        setItems(data.items);
        setParticipants(data.participants);
        setClaims(data.claims);
        if (data.results) setResults(data.results);
        sessionItemIds.current = new Set(data.items.map((i: SessionItem) => i.id));
        if (!stored) setShowJoin(true);
      })
      .catch(() => setError('Failed to load session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Set up Supabase Realtime
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (p) => {
        setSession((s) => s ? { ...s, ...p.new } : null);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `session_id=eq.${sessionId}` }, (p) => {
        if (p.eventType === 'UPDATE') {
          setItems((prev) => prev.map((i) => i.id === (p.new as SessionItem).id ? { ...i, ...p.new } : i));
        } else if (p.eventType === 'INSERT') {
          setItems((prev) => [...prev, p.new as SessionItem]);
          sessionItemIds.current.add((p.new as SessionItem).id);
        } else if (p.eventType === 'DELETE') {
          setItems((prev) => prev.filter((i) => i.id !== (p.old as SessionItem).id));
          sessionItemIds.current.delete((p.old as SessionItem).id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, (p) => {
        setParticipants((prev) => {
          if (prev.some((x) => x.id === (p.new as Participant).id)) return prev;
          return [...prev, p.new as Participant];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_claims', filter: `session_id=eq.${sessionId}` }, (p) => {
        if (p.eventType === 'INSERT') {
          setClaims((prev) => {
            if (prev.some((c) => c.id === (p.new as ItemClaim).id)) return prev;
            return [...prev, p.new as ItemClaim];
          });
        } else if (p.eventType === 'DELETE') {
          setClaims((prev) => prev.filter((c) => c.id !== (p.old as ItemClaim).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleJoin = (id: string) => {
    localStorage.setItem(`participant_${sessionId}`, id);
    setParticipantId(id);
    setShowJoin(false);
    // Refresh participants from server
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => setParticipants(data.participants));
  };

  const handleClaimChange = async (itemId: string, claiming: boolean) => {
    if (!participantId) return;
    if (claiming) {
      const res = await fetch(`/api/sessions/${sessionId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, participantId }),
      });
      if (res.ok) {
        const claim = await res.json();
        setClaims((prev) => prev.some((c) => c.id === claim.id) ? prev : [...prev, claim]);
      }
    } else {
      await fetch(`/api/sessions/${sessionId}/claims?itemId=${itemId}&participantId=${participantId}`, {
        method: 'DELETE',
      });
      setClaims((prev) => prev.filter((c) => !(c.item_id === itemId && c.participant_id === participantId)));
    }
  };

  const handleSharedChange = async (itemId: string, shared: boolean) => {
    const res = await fetch(`/api/sessions/${sessionId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shared }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => i.id === itemId ? updated : i));
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/calculate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setSession((s) => s ? { ...s, status: 'calculated' } : null);
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    localStorage.removeItem(`coordinator_${sessionId}`);
    localStorage.removeItem(`participant_${sessionId}`);
    router.push('/');
  };

  const sessionUrl = typeof window !== 'undefined' ? window.location.href : '';
  const currency = session?.currency || 'EUR';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{error || 'Session not found'}</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  return (
    <>
      {showJoin && (
        <JoinDialog
          sessionId={sessionId}
          restaurantName={session.restaurant_name}
          existingParticipants={participants}
          onJoin={handleJoin}
        />
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {session.restaurant_name || 'Bill Split'}
            </h1>
            {session.total && (
              <p className="text-sm text-gray-500 mt-0.5">
                Total: <span className="font-semibold text-gray-700">{fmt(session.total)}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session.status === 'open' && (
              <ShareButton url={sessionUrl} label="Share" />
            )}
            {isCoordinator && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete this session"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {session.status === 'calculated' && results ? (
        <ResultsView
          results={results}
          currency={currency}
          myParticipantId={participantId}
          sessionUrl={sessionUrl}
          billImageUrl={session.bill_image_url}
        />
      ) : (
        <>
          {/* Participants */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Participants ({participants.length})
              </h2>
            </div>
            <ParticipantsList
              participants={participants}
              claims={claims}
              items={items}
              myParticipantId={participantId}
              currency={currency}
            />
          </div>

          {/* Instructions */}
          {participantId && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mb-4">
              <p className="text-xs text-indigo-700">
                <strong>Tap checkboxes</strong> to claim your items.{' '}
                <strong>Tap <span className="inline-block">⇄</span></strong> to mark an item as shared by everyone.
              </p>
            </div>
          )}

          {/* Items */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Items ({items.length})
            </h2>
            <ItemsList
              items={items}
              claims={claims}
              participants={participants}
              participantId={participantId}
              sessionId={sessionId}
              currency={currency}
              onClaimChange={handleClaimChange}
              onSharedChange={handleSharedChange}
            />
          </div>

          {/* Calculate button */}
          <div className="sticky bottom-4">
            <button
              onClick={handleCalculate}
              disabled={calculating || participants.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-semibold text-base shadow-lg transition-colors"
            >
              {calculating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Calculating…</>
              ) : (
                <><Calculator className="w-5 h-5" /> Calculate Split</>
              )}
            </button>
          </div>
        </>
      )}
    </>
  );
}
