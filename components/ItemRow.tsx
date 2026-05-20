'use client';

import { Share2 } from 'lucide-react';
import clsx from 'clsx';
import type { SessionItem, ItemClaim, Participant } from '@/lib/types';

interface Props {
  item: SessionItem;
  claims: ItemClaim[];
  participants: Participant[];
  participantId: string | null;
  sessionId: string;
  currency: string;
  onClaimChange: (itemId: string, claiming: boolean) => Promise<void>;
  onSharedChange: (itemId: string, shared: boolean) => Promise<void>;
}

export function ItemRow({
  item,
  claims,
  participants,
  participantId,
  currency,
  onClaimChange,
  onSharedChange,
}: Props) {
  const isClaimed = claims.some((c) => c.participant_id === participantId && c.item_id === item.id);
  const claimants = claims
    .filter((c) => c.item_id === item.id)
    .map((c) => participants.find((p) => p.id === c.participant_id)?.name)
    .filter(Boolean);

  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
        item.shared
          ? 'bg-amber-50 border-amber-200'
          : isClaimed
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
      )}
    >
      {/* Claim checkbox */}
      {!item.shared && (
        <input
          type="checkbox"
          checked={isClaimed}
          disabled={!participantId}
          onChange={(e) => onClaimChange(item.id, e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
        />
      )}
      {item.shared && <div className="w-5 flex-shrink-0" />}

      {/* Name + claimants */}
      <div className="flex-1 min-w-0">
        <span className={clsx('text-sm font-medium', item.shared ? 'text-amber-800' : 'text-gray-900')}>
          {item.name}
        </span>
        {claimants.length > 0 && !item.shared && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{claimants.join(', ')}</p>
        )}
        {item.shared && (
          <p className="text-xs text-amber-600 mt-0.5">Shared — split equally</p>
        )}
      </div>

      {/* Price */}
      <span className={clsx('text-sm font-semibold tabular-nums flex-shrink-0', item.shared ? 'text-amber-700' : 'text-gray-900')}>
        {fmt(item.price)}
      </span>

      {/* Shared toggle */}
      <button
        onClick={() => onSharedChange(item.id, !item.shared)}
        title={item.shared ? 'Remove from shared' : 'Mark as shared by all'}
        className={clsx(
          'flex-shrink-0 p-1.5 rounded-lg transition-colors',
          item.shared
            ? 'bg-amber-200 text-amber-700 hover:bg-amber-300'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
      >
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
}
