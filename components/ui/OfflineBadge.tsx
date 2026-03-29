// components/ui/OfflineBadge.tsx
'use client';

import { useSyncExternalStore } from 'react';

// 1. Define how to subscribe to the browser's network events
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// 2. Define how to get the current value on the client
function getSnapshot() {
  return navigator.onLine;
}

// 3. Define what the server should render (prevents hydration mismatch)
function getServerSnapshot() {
  return true; // Always assume online during SSR so it renders 'null' and matches the client
}

export function OfflineBadge() {
  // 4. useSyncExternalStore entirely replaces useState, useEffect, and the 'mounted' flag!
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // If we are online, render nothing.
  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-full shadow-lg">
        Offline — AI still works locally
      </div>
    </div>
  );
}