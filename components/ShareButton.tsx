'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface Props {
  url: string;
  label?: string;
}

export function ShareButton({ url, label = 'Share via WhatsApp' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`Split the bill with me! 🍽️\n${url}`)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleWhatsApp}
        className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
      >
        <Share2 className="w-4 h-4" />
        {label}
      </button>
      <button
        onClick={handleCopy}
        title="Copy link"
        className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
