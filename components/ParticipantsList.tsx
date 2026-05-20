'use client';

import { User } from 'lucide-react';
import clsx from 'clsx';
import type { Participant, ItemClaim, SessionItem } from '@/lib/types';

interface Props {
  participants: Participant[];
  claims: ItemClaim[];
  items: SessionItem[];
  myParticipantId: string | null;
  currency: string;
}

export function ParticipantsList({ participants, claims, items, myParticipantId, currency }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  if (participants.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No one has joined yet — share the link!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => {
        const myClaims = claims.filter((c) => c.participant_id === p.id);
        const claimedTotal = myClaims.reduce((sum, c) => {
          const item = items.find((i) => i.id === c.item_id && !i.shared);
          if (!item) return sum;
          const splitBy = claims.filter((x) => x.item_id === item.id).length;
          return sum + item.price / splitBy;
        }, 0);
        const isMe = p.id === myParticipantId;

        return (
          <div
            key={p.id}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl',
              isMe ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50 border border-gray-100'
            )}
          >
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
              isMe ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-600'
            )}>
              {p.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={clsx('text-sm font-medium truncate', isMe ? 'text-indigo-700' : 'text-gray-700')}>
                {p.name}{isMe ? ' (you)' : ''}
              </p>
              <p className="text-xs text-gray-400">{myClaims.length} item{myClaims.length !== 1 ? 's' : ''}</p>
            </div>
            {myClaims.length > 0 && (
              <span className="text-sm font-semibold text-gray-700 tabular-nums flex-shrink-0">
                {fmt(claimedTotal)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
