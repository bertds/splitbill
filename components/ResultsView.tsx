'use client';

import { useState } from 'react';
import { CheckCircle, Receipt, X } from 'lucide-react';
import clsx from 'clsx';
import type { CalculationResult } from '@/lib/types';
import { ShareButton } from './ShareButton';

interface Props {
  results: CalculationResult[];
  currency: string;
  myParticipantId: string | null;
  sessionUrl: string;
  billImageUrl?: string | null;
}

export function ResultsView({ results, currency, myParticipantId, sessionUrl, billImageUrl }: Props) {
  const [showBill, setShowBill] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  const grandTotal = results.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">Bill calculated! Share the results with your group.</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <ShareButton url={sessionUrl} label="Share results via WhatsApp" />
        </div>
        {billImageUrl && (
          <button
            onClick={() => setShowBill(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Receipt className="w-4 h-4" />
            View bill
          </button>
        )}
      </div>

      {results.map((r) => {
        const isMe = r.participant_id === myParticipantId;
        return (
          <div
            key={r.participant_id}
            className={clsx(
              'rounded-2xl border overflow-hidden',
              isMe ? 'border-indigo-300 shadow-md' : 'border-gray-200'
            )}
          >
            <div className={clsx(
              'flex items-center justify-between px-4 py-3',
              isMe ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
            )}>
              <div className="flex items-center gap-2">
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                  isMe ? 'bg-white text-indigo-600' : 'bg-gray-300 text-gray-700'
                )}>
                  {r.name[0]?.toUpperCase()}
                </div>
                <span className="font-semibold">{r.name}{isMe ? ' (you)' : ''}</span>
              </div>
              <span className="text-lg font-bold tabular-nums">{fmt(r.total)}</span>
            </div>
            <div className="px-4 py-3 bg-white space-y-1">
              {r.line_items.map((li, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate pr-4">{li.item_name}</span>
                  <span className="tabular-nums flex-shrink-0">{fmt(li.amount)}</span>
                </div>
              ))}
              {r.line_items.length === 0 && (
                <p className="text-sm text-gray-400 italic">No items selected</p>
              )}
              <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-gray-900 tabular-nums">{fmt(r.total)}</span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex justify-between text-sm font-semibold text-gray-700 px-1">
        <span>Grand total split</span>
        <span className="tabular-nums">{fmt(grandTotal)}</span>
      </div>

      {/* Bill photo lightbox */}
      {showBill && billImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowBill(false)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowBill(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={billImageUrl}
              alt="Original bill"
              className="w-full rounded-xl max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
