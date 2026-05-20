'use client';

import { ItemRow } from './ItemRow';
import type { SessionItem, ItemClaim, Participant } from '@/lib/types';

interface Props {
  items: SessionItem[];
  claims: ItemClaim[];
  participants: Participant[];
  participantId: string | null;
  sessionId: string;
  currency: string;
  onClaimChange: (itemId: string, claiming: boolean) => Promise<void>;
  onSharedChange: (itemId: string, shared: boolean) => Promise<void>;
}

export function ItemsList({ items, ...rest }: Props) {
  const sharedItems = items.filter((i) => i.shared);
  const regularItems = items.filter((i) => !i.shared);

  return (
    <div className="space-y-2">
      {regularItems.map((item) => (
        <ItemRow key={item.id} item={item} {...rest} />
      ))}
      {sharedItems.length > 0 && (
        <>
          <div className="pt-2 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Shared by everyone
            </p>
          </div>
          {sharedItems.map((item) => (
            <ItemRow key={item.id} item={item} {...rest} />
          ))}
        </>
      )}
      {items.length === 0 && (
        <p className="text-center text-gray-400 py-8">No items yet</p>
      )}
    </div>
  );
}
