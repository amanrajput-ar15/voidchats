'use client';

import { useState } from 'react';
import { DeviceProfile } from '@/lib/types';
import { BatteryState } from '@/hooks/useBattery';
import { CONTEXT_TOKEN_BUDGET } from '@/lib/context/tokenCounter';

interface InferenceStats {
  tokensPerSecond: number | null;
  lastLatencyMs: number | null;
  totalTokensGenerated: number;
}

interface ContextStats {
  totalMessages: number;
  estimatedTokens: number;
  isNearLimit: boolean;
}

interface Props {
  deviceProfile: DeviceProfile;
  battery: BatteryState;
  inferenceStats: InferenceStats;
  contextStats: ContextStats;
  lastEvictionStrategy: string;
  lastEvictedCount: number;
}

export function DevInfoPanel({
  deviceProfile,
  battery,
  inferenceStats,
  contextStats,
  lastEvictionStrategy,
  lastEvictedCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const contextPercent = Math.min(
    Math.round((contextStats.estimatedTokens / CONTEXT_TOKEN_BUDGET) * 100),
    100
  );

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors"
      >
        {isOpen ? 'hide' : 'dev'}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-9 right-0 w-72 bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4 shadow-xl">

          <p className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
            Dev Info
          </p>

          {/* Model */}
          <div className="space-y-1">
            <p className="text-zinc-600 text-xs uppercase tracking-wider">
              Model
            </p>
            <p className="text-zinc-200 text-xs">
              {deviceProfile.selectedModel.displayName}
            </p>
            <p className="text-zinc-500 text-xs">
              {deviceProfile.selectedModel.quantization} ·{' '}
              {deviceProfile.tier} tier ·{' '}
              {deviceProfile.selectedModel.sizeGB}GB
            </p>
          </div>

          {/* Device */}
          <div className="space-y-1">
            <p className="text-zinc-600 text-xs uppercase tracking-wider">
              Device
            </p>
            <p className="text-zinc-200 text-xs">
              {deviceProfile.ramGB}GB RAM · {deviceProfile.cpuCores} cores
            </p>
            <p className="text-zinc-500 text-xs">
              {deviceProfile.gpuVendor} {deviceProfile.gpuArchitecture}
            </p>
          </div>

          {/* Inference */}
          <div className="space-y-1">
            <p className="text-zinc-600 text-xs uppercase tracking-wider">
              Inference
            </p>
            <p className="text-zinc-200 text-xs">
              {inferenceStats.tokensPerSecond !== null
                ? `${inferenceStats.tokensPerSecond.toFixed(1)} tok/s`
                : 'Not measured yet'}
            </p>
            {inferenceStats.lastLatencyMs !== null && (
              <p className="text-zinc-500 text-xs">
                {inferenceStats.lastLatencyMs}ms to first token
              </p>
            )}
            <p className="text-zinc-500 text-xs">
              {inferenceStats.totalTokensGenerated} total tokens generated
            </p>
          </div>

          {/* Context window */}
          <div className="space-y-2">
            <p className="text-zinc-600 text-xs uppercase tracking-wider">
              Context Window
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    contextStats.isNearLimit
                      ? 'bg-amber-500'
                      : 'bg-zinc-400'
                  }`}
                  style={{ width: `${contextPercent}%` }}
                />
              </div>
              <span className="text-zinc-400 text-xs flex-shrink-0 font-mono">
                {contextStats.estimatedTokens}/{CONTEXT_TOKEN_BUDGET}
              </span>
            </div>
            <p className="text-zinc-500 text-xs">
              {contextStats.totalMessages} messages ·{' '}
              {lastEvictionStrategy !== 'none' && lastEvictedCount > 0
                ? `${lastEvictedCount} evicted (${lastEvictionStrategy})`
                : 'no eviction'}
            </p>
          </div>

          {/* Battery */}
          {battery.isSupported && (
            <div className="space-y-1">
              <p className="text-zinc-600 text-xs uppercase tracking-wider">
                Battery
              </p>
              <p
                className={`text-xs ${
                  battery.isCritical
                    ? 'text-red-400'
                    : battery.isLowBattery
                    ? 'text-amber-400'
                    : 'text-zinc-200'
                }`}
              >
                {Math.round(battery.level * 100)}%{' '}
                {battery.isCharging ? '· charging' : '· on battery'}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}