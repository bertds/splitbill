'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ChevronRight, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import type { OcrProvider } from '@/lib/types';
import { loadApiKeys } from './SettingsModal';

interface ParsedItem { name: string; price: number }

interface ProviderResult {
  provider: OcrProvider | 'openai';
  status: 'pending' | 'loading' | 'done' | 'error';
  restaurant_name?: string | null;
  currency?: string;
  total?: number;
  items?: ParsedItem[];
  raw_item_count?: number;
  error?: string;
  durationMs?: number;
}

const PROVIDERS: { value: OcrProvider | 'openai'; label: string; keyNeeded: keyof ReturnType<typeof loadApiKeys> | null }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', keyNeeded: 'anthropic' },
  { value: 'openai', label: 'GPT-4o (OpenAI)', keyNeeded: 'openai' },
  { value: 'gemini', label: 'Gemini Flash (Google)', keyNeeded: 'google' },
  { value: 'local', label: 'Tesseract (Local)', keyNeeded: null },
];

interface Props {
  file: File;
  onSelect: (items: ParsedItem[], currency: string, restaurantName: string | null, total: number | null) => void;
  onCancel: () => void;
}

export function OcrCompare({ file, onSelect, onCancel }: Props) {
  const [results, setResults] = useState<ProviderResult[]>(
    PROVIDERS.map((p) => ({ provider: p.value, status: 'pending' }))
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<ParsedItem[]>([]);

  useEffect(() => {
    const keys = loadApiKeys();

    PROVIDERS.forEach(async (p, i) => {
      // Skip providers with no key configured
      if (p.keyNeeded && !keys[p.keyNeeded] && !hasServerKey(p.value)) {
        setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: 'error', error: 'No API key configured' } : r));
        return;
      }

      setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: 'loading' } : r));
      const start = Date.now();

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('provider', p.value);

        const headers: Record<string, string> = {};
        if (keys.anthropic) headers['x-anthropic-key'] = keys.anthropic;
        if (keys.google) headers['x-google-key'] = keys.google;
        if (keys.openai) headers['x-openai-key'] = keys.openai;

        const res = await fetch('/api/ocr-test', { method: 'POST', headers, body: formData });
        const data = await res.json();
        const durationMs = Date.now() - start;

        if (!res.ok || data.error) {
          setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: 'error', error: data.error, durationMs } : r));
        } else {
          setResults((prev) => prev.map((r, j) => j === i ? { ...r, status: 'done', ...data, durationMs } : r));
        }
      } catch (e) {
        setResults((prev) => prev.map((r, j) =>
          j === i ? { ...r, status: 'error', error: e instanceof Error ? e.message : 'Failed', durationMs: Date.now() - start } : r
        ));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number, currency = 'EUR') =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(n);

  const startEdit = (i: number) => {
    setEditing(i);
    setEditedItems(results[i].items ?? []);
  };

  const handleUse = (i: number) => {
    const r = results[i];
    const items = editing === i ? editedItems : r.items ?? [];
    onSelect(items, r.currency ?? 'EUR', r.restaurant_name ?? null, r.total ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Compare OCR providers</h2>
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <p className="text-xs text-gray-500">
        Running all providers in parallel. Pick the best result, optionally edit items, then proceed.
      </p>

      {results.map((r, i) => (
        <div key={r.provider} className={clsx(
          'border rounded-2xl overflow-hidden',
          r.status === 'done' ? 'border-green-200' : r.status === 'error' ? 'border-red-200' : 'border-gray-200'
        )}>
          {/* Header */}
          <div className={clsx(
            'flex items-center justify-between px-4 py-2.5',
            r.status === 'done' ? 'bg-green-50' : r.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
          )}>
            <div className="flex items-center gap-2">
              {r.status === 'loading' && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
              {r.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              {r.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              {r.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
              <span className="text-sm font-semibold text-gray-800">{PROVIDERS[i].label}</span>
            </div>
            <div className="flex items-center gap-2">
              {r.durationMs && (
                <span className="text-xs text-gray-400">{(r.durationMs / 1000).toFixed(1)}s</span>
              )}
              {r.status === 'done' && r.items && (
                <span className="text-xs text-gray-500">{r.items.length} items</span>
              )}
              {r.status === 'done' && r.total && (
                <span className="text-xs font-semibold text-gray-700">{fmt(r.total, r.currency)}</span>
              )}
            </div>
          </div>

          {/* Body */}
          {r.status === 'loading' && (
            <div className="px-4 py-3 text-sm text-gray-500">Analyzing…</div>
          )}
          {r.status === 'error' && (
            <div className="px-4 py-3 text-sm text-red-600">{r.error}</div>
          )}
          {r.status === 'done' && r.items && (
            <div className="px-4 py-3">
              {editing === i ? (
                <div className="space-y-1 mb-3">
                  {editedItems.map((item, j) => (
                    <div key={j} className="flex gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => setEditedItems((prev) => prev.map((x, k) => k === j ? { ...x, name: e.target.value } : x))}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        value={item.price}
                        step="0.01"
                        onChange={(e) => setEditedItems((prev) => prev.map((x, k) => k === j ? { ...x, price: parseFloat(e.target.value) || 0 } : x))}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-right"
                      />
                      <button
                        onClick={() => setEditedItems((prev) => prev.filter((_, k) => k !== j))}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditedItems((prev) => [...prev, { name: '', price: 0 }])}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >+ Add item</button>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-0.5 mb-3">
                  {r.items.slice(0, 8).map((item, j) => (
                    <div key={j} className="flex justify-between text-xs text-gray-600">
                      <span className="truncate pr-3">{item.name}</span>
                      <span className="tabular-nums flex-shrink-0">{fmt(item.price, r.currency)}</span>
                    </div>
                  ))}
                  {r.items.length > 8 && (
                    <p className="text-xs text-gray-400">…and {r.items.length - 8} more</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => editing === i ? setEditing(null) : startEdit(i)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 px-2.5 py-1.5 rounded-lg"
                >
                  <Edit3 className="w-3 h-3" />
                  {editing === i ? 'Done editing' : 'Edit'}
                </button>
                <button
                  onClick={() => handleUse(i)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Use this result <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function hasServerKey(provider: string): boolean {
  // Conservative: assume server might have keys configured
  return provider === 'local';
}
