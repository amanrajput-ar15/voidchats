// components/ui/OfflineBadge.tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBadge() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-4 py-2 rounded-full shadow-lg">
        Offline — AI still works locally
      </div>
    </div>
  );
}