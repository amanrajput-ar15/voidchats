// components/ui/PassphraseSetup.tsx
'use client';

import { useState } from 'react';

interface Props {
  onPassphraseSet: (passphrase: string) => void;
}

export function PassphraseSetup({ onPassphraseSet }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setError('');

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters.');
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Store in sessionStorage — cleared when tab closes
      // Never store the passphrase in IndexedDB or localStorage
      sessionStorage.setItem('vc-passphrase', passphrase);
      onPassphraseSet(passphrase);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-sm w-full mx-auto px-8">

        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-semibold mb-2">
            Encrypt your conversations
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Your conversations are stored locally and encrypted.
            This passphrase never leaves your device.
          </p>
        </div>

        <div className="space-y-3 mb-2">
          <input
            type="password"
            placeholder="Passphrase (min 8 characters)"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-zinc-900 text-white text-sm px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 placeholder-zinc-600 transition-colors"
          />
          <input
            type="password"
            placeholder="Confirm passphrase"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-zinc-900 text-white text-sm px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 placeholder-zinc-600 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-4 px-1">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-white text-black text-sm font-medium py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors mt-4"
        >
          {isLoading ? 'Setting up...' : 'Start chatting'}
        </button>

        <p className="text-zinc-700 text-xs text-center mt-4">
          Re-enter each visit · stored in session only
        </p>

      </div>
    </div>
  );
}