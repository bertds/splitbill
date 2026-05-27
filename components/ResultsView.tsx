'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Receipt, X, ZoomIn, ZoomOut } from 'lucide-react';
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

function BillViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 }); // percent
  const lastTouch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));

  const zoom = (delta: number, cx = 50, cy = 50) => {
    setScale((s) => clampScale(s + delta));
    setOrigin({ x: cx, y: cy });
  };

  // Pinch-to-zoom via touch events
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = rect ? ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width * 100 : 50;
      const cy = rect ? ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height * 100 : 50;
      lastTouch.current = { dist, cx, cy };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouch.current) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastTouch.current.dist;
      setScale((s) => clampScale(s * ratio));
      setOrigin({ x: lastTouch.current!.cx, y: lastTouch.current!.cy });
      lastTouch.current = { dist, cx: lastTouch.current.cx, cy: lastTouch.current.cy };
    }
  };

  // Reset zoom on double-tap
  const lastTap = useRef(0);
  const onTouchEnd = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) setScale(1);
    lastTap.current = now;
    lastTouch.current = null;
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm flex-shrink-0">
        <span className="text-white/70 text-sm">Original bill</span>
        <div className="flex items-center gap-3">
          <button onClick={() => zoom(-0.5)} disabled={scale <= 1} className="p-2 rounded-lg text-white/80 hover:text-white disabled:opacity-30">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(0.5)} disabled={scale >= 5} className="p-2 rounded-lg text-white/80 hover:text-white disabled:opacity-30">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image — scrollable + zoomable */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto touch-pan-x touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: scale > 1 ? 'none' : 'pan-x pan-y' }}
      >
        <img
          src={url}
          alt="Original bill"
          draggable={false}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: 'transform 0.1s ease-out',
            width: '100%',
            display: 'block',
            userSelect: 'none',
          }}
        />
      </div>

      <p className="text-center text-white/40 text-xs py-2 flex-shrink-0">
        Pinch to zoom · Double-tap to reset
      </p>
    </div>
  );
}

export function ResultsView({ results, currency, myParticipantId, sessionUrl, billImageUrl }: Props) {
  const [showBill, setShowBill] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  const grandTotal = results.reduce((s, r) => s + r.total, 0);

  return (
    <>
      {showBill && billImageUrl && (
        <BillViewer url={billImageUrl} onClose={() => setShowBill(false)} />
      )}

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
      </div>
    </>
  );
}
