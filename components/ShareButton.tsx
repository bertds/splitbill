'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

interface Props {
  url: string;
  label?: string;
  text?: string; // message to include in native share
  variant?: 'indigo' | 'green';
}

export function ShareButton({ url, label = 'Share', text, variant = 'indigo' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Native share sheet (mobile: WhatsApp, Telegram, iMessage, etc.)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'SplitBill',
          text: text ?? 'Split the bill with me! 🍽️',
          url,
        });
        return;
      } catch (e) {
        // User cancelled → do nothing; other errors fall through to copy
        if ((e as Error).name === 'AbortError') return;
      }
    }
    // Desktop / unsupported browser fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const bgClass = variant === 'green'
    ? 'bg-green-500 hover:bg-green-600'
    : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <button
      onClick={handleShare}
      className={`w-full flex items-center justify-center gap-2 ${bgClass} active:opacity-80 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors`}
    >
      {copied
        ? <><Check className="w-4 h-4" /> Link copied!</>
        : <><Share2 className="w-4 h-4" /> {label}</>
      }
    </button>
  );
}
