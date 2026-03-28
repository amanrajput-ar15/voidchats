// components/loading/ModelLoader.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ModelConfig } from '@/lib/types';

interface Props {
  model: ModelConfig;
  onLoad: (onProgress: (report: { text: string }) => void) => Promise<void>;
  onReady: () => void;
  onError: (err: string) => void;
}

export function ModelLoader({ model, onLoad, onReady, onError }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function load() {
      try {
        await onLoad((report) => {
          const text = report.text ?? '';
          setStatusText(text);

          const match = text.match(/\[(\d+)\/(\d+)\]/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            setProgress(Math.round((current / total) * 100));
          } else if (text.toLowerCase().includes('compil')) {
            setProgress(85);
            setStatusText('Compiling WebGPU shaders...');
          } else if (
            text.toLowerCase().includes('finish') ||
            text.toLowerCase().includes('ready')
          ) {
            setProgress(100);
            setStatusText('Ready.');
          } else if (text.toLowerCase().includes('fetch')) {
            setStatusText('Downloading model weights...');
          }
        });

        setProgress(100);
        setStatusText('Ready.');
        setTimeout(onReady, 600);
      } catch (err) {
        onError(String(err));
      }
    }

    load();
  }, [onLoad, onReady, onError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm mx-auto px-8">

        <div className="text-center mb-10">
          <h1 className="text-white text-3xl font-semibold tracking-tight">
            VoidChats
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Private AI — runs in your browser
          </p>
        </div>

        <div className="bg-zinc-900 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-zinc-300 text-sm font-medium">{model.displayName}</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {model.sizeGB}GB · {model.quantization}
            </p>
          </div>
          <div className="text-zinc-600 text-xs text-right">
            <p>WebGPU</p>
            <p>In-browser</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-xs truncate pr-4">{statusText}</p>
          <p className="text-zinc-400 text-xs font-mono flex-shrink-0">{progress}%</p>
        </div>

        {progress < 10 && (
          <p className="text-zinc-600 text-xs text-center mt-8">
            First load downloads ~{model.sizeGB}GB · cached forever after
          </p>
        )}
      </div>
    </div>
  );
}