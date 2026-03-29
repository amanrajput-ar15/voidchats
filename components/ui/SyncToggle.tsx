// components/ui/SyncToggle.tsx
'use client';

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface Props {
  onSyncEnabledChange: (enabled: boolean) => void;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

export function SyncToggle({
  onSyncEnabledChange,
  isSyncing,
  lastSyncTime,
}: Props) {
  const isOnline = useOnlineStatus();
  
  // FIX 1: Lazy State Initialization. 
  // This checks local storage exactly once during the initial render.
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vc-sync-enabled') === 'true';
    }
    return false;
  });

  const [timeAgoText, setTimeAgoText] = useState('');

  // FIX 2: We removed the local `setEnabled` call.
  // We only use this effect to notify the parent component of the initial state.
  useEffect(() => {
    const stored = localStorage.getItem('vc-sync-enabled');
    if (stored === 'true') {
      onSyncEnabledChange(true);
    }
  }, [onSyncEnabledChange]);

  // Time formatting effect (from our previous fix)
  useEffect(() => {
    if (!lastSyncTime) return;

    function updateTimeText() {
      const diff = Date.now() - lastSyncTime!;
      if (diff < 60_000) setTimeAgoText('just now');
      else if (diff < 3_600_000) setTimeAgoText(`${Math.floor(diff / 60_000)}m ago`);
      else setTimeAgoText(`${Math.floor(diff / 3_600_000)}h ago`);
    }

    updateTimeText();
    const intervalId = setInterval(updateTimeText, 60_000);
    return () => clearInterval(intervalId);
  }, [lastSyncTime]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('vc-sync-enabled', String(next));
    onSyncEnabledChange(next);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        {/* FIX 3: suppressHydrationWarning added to elements relying on local state */}
        <span suppressHydrationWarning className="text-zinc-500 text-xs font-medium">
          {!isOnline
            ? 'offline'
            : isSyncing
            ? 'syncing...'
            : lastSyncTime
            ? `synced ${timeAgoText}`
            : enabled
            ? 'sync on'
            : 'sync off'}
        </span>
      </div>
      
      <button
        onClick={toggle}
        disabled={!isOnline}
        role="switch"
        aria-checked={enabled}
        suppressHydrationWarning
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-40 ${
          enabled ? 'bg-white' : 'bg-zinc-700'
        }`}
        title={enabled ? 'Disable cloud sync' : 'Enable cloud sync'}
      >
        <span
          suppressHydrationWarning
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black transition-transform duration-200 ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}