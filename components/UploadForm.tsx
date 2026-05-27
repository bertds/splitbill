'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, AlertCircle, Settings, GitCompare } from 'lucide-react';
import clsx from 'clsx';
import type { OcrProvider } from '@/lib/types';
import { SettingsModal, loadApiKeys } from './SettingsModal';
import { OcrCompare } from './OcrCompare';

const PROVIDERS: { value: OcrProvider | 'openai'; label: string; note: string }[] = [
  { value: 'claude', label: 'Claude', note: 'Best quality' },
  { value: 'openai', label: 'GPT-4o', note: 'Great quality' },
  { value: 'gemini', label: 'Gemini', note: 'Great quality' },
  { value: 'local', label: 'Tesseract', note: 'No API key' },
];

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState<OcrProvider | 'openai'>('claude');
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const createSession = async (
    file: File | null,
    chosenProvider: string,
    preItems?: { name: string; price: number }[],
    restaurantName?: string | null,
    currency?: string,
    total?: number | null
  ) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) formData.append('image', file);
      formData.append('provider', chosenProvider);
      if (restaurantName) formData.append('restaurant_name', restaurantName);
      if (currency) formData.append('currency', currency);
      if (total != null) formData.append('total', String(total));
      if (preItems) formData.append('items', JSON.stringify(preItems));

      const keys = loadApiKeys();
      const headers: Record<string, string> = {};
      if (keys.anthropic) headers['x-anthropic-key'] = keys.anthropic;
      if (keys.google) headers['x-google-key'] = keys.google;
      if (keys.openai) headers['x-openai-key'] = keys.openai;

      const res = await fetch('/api/sessions', { method: 'POST', headers, body: formData });
      const raw = await res.text();
      let data: { sessionId?: string; error?: string };
      try {
        data = JSON.parse(raw);
      } catch {
        // Empty or non-JSON body = server crashed (e.g. Tesseract OOM / timeout)
        throw new Error(
          'The server returned no response — Tesseract may have crashed or timed out. ' +
          'Try Claude, GPT-4o or Gemini instead.'
        );
      }
      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      localStorage.setItem(`coordinator_${data.sessionId}`, 'true');
      router.push(`/session/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    createSession(selectedFile, provider);
  };

  const handleCompareSelect = (
    items: { name: string; price: number }[],
    currency: string,
    restaurantName: string | null,
    total: number | null
  ) => {
    setCompareMode(false);
    createSession(null, 'local', items, restaurantName, currency, total);
  };

  if (compareMode && selectedFile) {
    return (
      <OcrCompare
        file={selectedFile}
        onSelect={handleCompareSelect}
        onCancel={() => setCompareMode(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Top row: settings button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          API Keys
        </button>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl cursor-pointer transition-colors overflow-hidden',
          isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
          loading && 'pointer-events-none opacity-75'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Bill preview" className="w-full max-h-64 object-contain p-2" />
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-indigo-700">Analyzing bill…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium">Drop your bill photo here</p>
            <p className="text-sm text-gray-400 mt-1">or tap to take a photo / choose file</p>
          </div>
        )}
      </div>

      {/* Provider selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">OCR method</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              className={clsx(
                'flex flex-col items-center px-1 py-2 rounded-xl border text-center transition-colors',
                provider === p.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <span className="text-xs font-semibold">{p.label}</span>
              <span className="text-[10px] mt-0.5 opacity-70 leading-tight">{p.note}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
          className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </span>
          ) : (
            'Analyze & Split'
          )}
        </button>
        <button
          onClick={() => selectedFile && setCompareMode(true)}
          disabled={!selectedFile || loading}
          title="Compare all providers side-by-side"
          className="flex items-center gap-1.5 px-3.5 py-3.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-xl text-sm font-medium transition-colors"
        >
          <GitCompare className="w-4 h-4" />
          Compare
        </button>
      </div>
    </div>
  );
}
