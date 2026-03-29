// components/ui/InstallBanner.tsx
'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // ARCHITECTURE NOTE: 'isInstalled' state was removed.
  // The browser guarantees 'beforeinstallprompt' will not fire if already installed.

  useEffect(() => {
    // 1. Create stable, named references for event listeners
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      // If the user installs via the browser's native menu while the banner is visible,
      // this clears the prompt to unmount the banner.
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      // 2. Properly detach BOTH listeners using the exact references
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  if (!installPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              Install VoidChats
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Add to homescreen for offline access
            </p>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 text-xs flex-shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full bg-white text-black text-sm font-medium py-2 rounded-lg mt-3 hover:bg-zinc-200 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}