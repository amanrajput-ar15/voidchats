// components/loading/DeviceCheck.tsx
'use client';

import { ReactNode } from 'react';

interface Props {
  hasWebGPU: boolean;
  children: ReactNode;
}

export function DeviceCheck({ hasWebGPU, children }: Props) {
  if (hasWebGPU) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md mx-auto p-8 text-center">

        <div className="text-5xl mb-6">⚠️</div>

        <h1 className="text-white text-2xl font-semibold mb-3">
          WebGPU Not Supported
        </h1>

        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          VoidChats runs AI entirely in your browser using WebGPU.
          Your current browser does not support it.
        </p>

        <div className="bg-zinc-900 rounded-lg p-4 text-left mb-6">
          <p className="text-zinc-300 text-sm font-medium mb-2">
            To use VoidChats:
          </p>
          <ul className="text-zinc-400 text-sm space-y-1">
            <li>• Use Chrome 113+ or Edge 113+</li>
            <li>• Firefox does not support WebGPU yet</li>
            <li>• Make sure your GPU drivers are updated</li>
          </ul>
        </div>

        <button
          onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
          className="bg-white text-black text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Download Chrome
        </button>

      </div>
    </div>
  );
}