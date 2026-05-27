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

  // Who else has claimed this specific item (excluding me)?
  const otherClaimants = claims
    .filter((c) => c.item_id === item.id && c.participant_id !== participantId)
    .map((c) => participants.find((p) => p.id === c.participant_id)?.name)
    .filter(Boolean) as string[];

  const allClaimants = claims
    .filter((c) => c.item_id === item.id)
    .map((c) => participants.find((p) => p.id === c.participant_id)?.name)
    .filter(Boolean) as string[];

  // Exclusive claiming: if someone else claimed this item and I haven't, lock it
  const lockedByOther = !item.shared && otherClaimants.length > 0 && !isClaimed;

  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
        item.shared
          ? 'bg-amber-50 border-amber-200'
          : lockedByOther
          ? 'bg-gray-50 border-gray-100'
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
          disabled={!participantId || lockedByOther}
          onChange={(e) => onClaimChange(item.id, e.target.checked)}
          className={clsx(
            'w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0',
            lockedByOther ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
          )}
        />
      )}
      {item.shared && <div className="w-5 flex-shrink-0" />}

      {/* Name + claimants */}
      <div className="flex-1 min-w-0">
        <span className={clsx(
          'text-sm font-medium',
          item.shared ? 'text-amber-800' : lockedByOther ? 'text-gray-400' : 'text-gray-900'
        )}>
          {item.name}
        </span>
        {allClaimants.length > 0 && !item.shared && (
          <p className={clsx(
            'text-xs mt-0.5 truncate',
            lockedByOther ? 'text-gray-400' : 'text-gray-500'
          )}>
            {allClaimants.join(', ')}
          </p>
        )}
        {item.shared && (
          <p className="text-xs text-amber-600 mt-0.5">Shared — split equally</p>
        )}
      </div>

      {/* Price */}
      <span className={clsx(
        'text-sm font-semibold tabular-nums flex-shrink-0',
        item.shared ? 'text-amber-700' : lockedByOther ? 'text-gray-400' : 'text-gray-900'
      )}>
        {fmt(item.price)}
      </span>

      {/* Shared toggle — only show for non-locked items or coordinator */}
      <button
        onClick={() => onSharedChange(item.id, !item.shared)}
        title={item.shared ? 'Remove from shared' : 'Mark as shared by all'}
        className={clsx(
          'flex-shrink-0 p-1.5 rounded-lg transition-colors',
          item.shared
            ? 'bg-amber-200 text-amber-700 hover:bg-amber-300'
            : lockedByOther
            ? 'text-gray-200 hover:text-gray-400 hover:bg-gray-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        )}
      >
        <Share2 className="w-4 h-4" />
      </button>
    </div>
  );
}
