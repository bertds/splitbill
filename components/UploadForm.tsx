'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { OcrProvider } from '@/lib/types';

const PROVIDERS: { value: OcrProvider; label: string; note: string; needsKey?: string }[] = [
  { value: 'claude', label: 'Claude AI', note: 'Best quality', needsKey: 'ANTHROPIC_API_KEY' },
  { value: 'gemini', label: 'Gemini AI', note: 'Great quality', needsKey: 'GOOGLE_API_KEY' },
  { value: 'local', label: 'Local (Tesseract)', note: 'No API key needed, lower quality' },
];

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState<OcrProvider>('claude');
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    setSelectedFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
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

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('provider', provider);

      const res = await fetch('/api/sessions', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to analyze bill');

      localStorage.setItem(`coordinator_${data.sessionId}`, 'true');
      router.push(`/session/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
          capture="environment"
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
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              className={clsx(
                'flex flex-col items-center px-2 py-2.5 rounded-xl border text-center transition-colors',
                provider === p.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <span className="text-xs font-semibold">{p.label}</span>
              <span className="text-[10px] mt-0.5 opacity-70">{p.note}</span>
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

      <button
        onClick={handleSubmit}
        disabled={!selectedFile || loading}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing bill…
          </span>
        ) : (
          'Analyze & Create Split'
        )}
      </button>
    </div>
  );
}
