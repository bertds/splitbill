'use client';

import { useEffect, useState } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, Server } from 'lucide-react';

export interface ApiKeys {
  anthropic: string;
  google: string;
  openai: string;
}

const STORAGE_KEY = 'splitbill_api_keys';

export function loadApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return { anthropic: '', google: '', openai: '' };
  try {
    return { anthropic: '', google: '', openai: '', ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { anthropic: '', google: '', openai: '' };
  }
}

export function saveApiKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

interface ServerConfig {
  claude: boolean;
  gemini: boolean;
  openai: boolean;
}

interface Props {
  onClose: () => void;
}

const FIELDS: { key: keyof ApiKeys; serverKey: keyof ServerConfig; label: string; placeholder: string; provider: string }[] = [
  { key: 'anthropic', serverKey: 'claude',  label: 'Anthropic API Key', placeholder: 'sk-ant-api03-…', provider: 'Claude' },
  { key: 'google',    serverKey: 'gemini',  label: 'Google AI API Key', placeholder: 'AIzaSy…',        provider: 'Gemini' },
  { key: 'openai',    serverKey: 'openai',  label: 'OpenAI API Key',    placeholder: 'sk-proj-…',       provider: 'GPT-4o' },
];

export function SettingsModal({ onClose }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: '', google: '', openai: '' });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    setKeys(loadApiKeys());
    fetch('/api/config')
      .then((r) => r.json())
      .then(setServerConfig)
      .catch(() => {});
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
          Keys entered here are stored only in your browser and override server-configured keys.
          Leave blank to use server keys where available.
        </p>

        <div className="space-y-4">
          {FIELDS.map((f) => {
            const serverHasKey = serverConfig?.[f.serverKey];
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">
                    {f.label} <span className="text-gray-400 font-normal">({f.provider})</span>
                  </label>
                  {serverHasKey && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <Server className="w-2.5 h-2.5" />
                      configured on server
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={show[f.key] ? 'text' : 'password'}
                    value={keys[f.key]}
                    onChange={(e) => setKeys((k) => ({ ...k, [f.key]: e.target.value }))}
                    placeholder={serverHasKey ? '(using server key — enter here to override)' : f.placeholder}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {keys[f.key] && (
                    <button
                      type="button"
                      onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  {serverHasKey && !keys[f.key] && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                  )}
                </div>
              </div>
            );
          })}
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
