// hooks/useOnlineStatus.ts
'use client';

import { useSyncExternalStore } from 'react';

// 1. Tell React how to subscribe to the browser's network events
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  
  // Return the cleanup function
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// 2. Tell React how to get the actual value on the client
function getSnapshot() {
  return navigator.onLine;
}

// 3. Tell React what to render on the server to prevent hydration crashes
function getServerSnapshot() {
  return true; // Always assume online during SSR
}

export function useOnlineStatus(): boolean {
  // 4. This single hook replaces useState, useEffect, and eliminates the linter error
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}