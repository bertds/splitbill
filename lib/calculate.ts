import type { SessionItem, Participant, ItemClaim, CalculationResult } from './types';

export function calculateSplit(
  items: SessionItem[],
  participants: Participant[],
  claims: ItemClaim[]
): CalculationResult[] {
  if (participants.length === 0) return [];

  const sharedItems = items.filter((i) => i.shared);
  const sharedTotal = sharedItems.reduce((s, i) => s + i.price, 0);
  const perPersonShared = participants.length > 0 ? sharedTotal / participants.length : 0;

  return participants.map((p) => {
    const myClaims = claims.filter((c) => c.participant_id === p.id);
    const lineItems: { item_name: string; amount: number }[] = [];
    let subtotal = 0;

    for (const claim of myClaims) {
      const item = items.find((i) => i.id === claim.item_id && !i.shared);
      if (!item) continue;
      const claimantCount = claims.filter((c) => c.item_id === item.id).length;
      const amount = item.price / claimantCount;
      subtotal += amount;
      lineItems.push({
        item_name: claimantCount > 1 ? `${item.name} (÷${claimantCount})` : item.name,
        amount,
      });
    }

    for (const item of sharedItems) {
      lineItems.push({
        item_name: `${item.name} (shared ÷${participants.length})`,
        amount: item.price / participants.length,
      });
    }

    return {
      participant_id: p.id,
      name: p.name,
      line_items: lineItems,
      subtotal,
      shared_cost: perPersonShared,
      total: subtotal + perPersonShared,
    };
  });
}
