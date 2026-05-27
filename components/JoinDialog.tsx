'use client';

import { useState } from 'react';
import { Users, UserCheck } from 'lucide-react';
import type { Participant } from '@/lib/types';

interface Props {
  sessionId: string;
  restaurantName: string | null;
  existingParticipants: Participant[];
  onJoin: (participantId: string, name: string) => void;
}

export function JoinDialog({ sessionId, restaurantName, existingParticipants, onJoin }: Props) {
  const [mode, setMode] = useState<'pick' | 'new'>(existingParticipants.length > 0 ? 'pick' : 'new');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRejoin = (p: Participant) => {
    onJoin(p.id, p.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Failed to join');
      const participant = await res.json();
      onJoin(participant.id, participant.name);
    } catch {
      setError('Could not join. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4 mx-auto">
          <Users className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-center text-gray-900 mb-1">Join the split</h2>
        {restaurantName && (
          <p className="text-sm text-center text-gray-500 mb-4">{restaurantName}</p>
        )}

        {/* Pick existing participant */}
        {existingParticipants.length > 0 && mode === 'pick' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">Are you already on the list?</p>
            <div className="space-y-2">
              {existingParticipants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleRejoin(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <UserCheck className="w-4 h-4 text-indigo-400 ml-auto" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode('new')}
              className="w-full text-sm text-indigo-600 hover:text-indigo-800 py-2 font-medium"
            >
              I'm not on the list — add me
            </button>
          </div>
        )}

        {/* Enter new name */}
        {mode === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join & select items'}
            </button>
            {existingParticipants.length > 0 && (
              <button
                type="button"
                onClick={() => setMode('pick')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                ← Back to list
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
