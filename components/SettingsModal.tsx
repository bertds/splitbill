'use client';

import { useEffect, useState } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';

export interface ApiKeys {
  anthropic: string;
  google: string;
  openai: string;
}

const STORAGE_KEY = 'splitbill_api_keys';

export function loadApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return { anthropic: '', google: '', openai: '' };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return { anthropic: '', google: '', openai: '' };
  }
}

export function saveApiKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

interface Props {
  onClose: () => void;
}

const FIELDS = [
  { key: 'anthropic' as const, label: 'Anthropic API Key', placeholder: 'sk-ant-api03-…', provider: 'Claude' },
  { key: 'google' as const, label: 'Google AI API Key', placeholder: 'AIzaSy…', provider: 'Gemini' },
  { key: 'openai' as const, label: 'OpenAI API Key', placeholder: 'sk-proj-…', provider: 'GPT-4o' },
];

export function SettingsModal({ onClose }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: '', google: '', openai: '' });
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setKeys(loadApiKeys());
  }, []);

  const handleSave = () => {
    saveApiKeys(keys);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">API Keys</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Keys are stored only in your browser (localStorage) and sent only for OCR requests. Leave blank to use server-configured keys.
        </p>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {f.label} <span className="text-gray-400 font-normal">({f.provider})</span>
              </label>
              <div className="relative">
                <input
                  type={show[f.key] ? 'text' : 'password'}
                  value={keys[f.key]}
                  onChange={(e) => setKeys((k) => ({ ...k, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Save keys
          </button>
        </div>
      </div>
    </div>
  );
}
