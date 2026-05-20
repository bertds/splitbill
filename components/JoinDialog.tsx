'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';

interface Props {
  sessionId: string;
  restaurantName: string | null;
  onJoin: (participantId: string, name: string) => void;
}

export function JoinDialog({ sessionId, restaurantName, onJoin }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        </form>
      </div>
    </div>
  );
}
