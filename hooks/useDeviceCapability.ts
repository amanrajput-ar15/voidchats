// hooks/useDeviceCapability.ts
'use client';

import { useState, useEffect } from 'react';
import { DeviceProfile } from '@/lib/types';
import { selectModel } from '@/lib/webllm/models';

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
}

interface GPUAdapterInfo {
  vendor?: string;
  architecture?: string;
}

interface GPUAdapter {
  info?: GPUAdapterInfo;
  requestAdapterInfo?: () => Promise<GPUAdapterInfo>;
}

interface GPUInstance {
  requestAdapter: () => Promise<GPUAdapter | null>;
}

export function useDeviceCapability(): DeviceProfile | null {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    async function detect() {
      const nav = navigator as ExtendedNavigator;

      // Step 1 — RAM
      const ramGB = nav.deviceMemory ?? 4;

      // Step 2 — CPU
      const cpuCores = navigator.hardwareConcurrency ?? 4;

      // Step 3 — WebGPU
      const gpu = (navigator as Navigator & { gpu?: GPUInstance }).gpu;
      const hasWebGPU = !!gpu;

      // Step 4 — GPU vendor + architecture
      let gpuVendor = 'unknown';
      let gpuArchitecture = 'unknown';

      if (hasWebGPU && gpu) {
        try {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            if (adapter.info) {
              gpuVendor = adapter.info.vendor ?? 'unknown';
              gpuArchitecture = adapter.info.architecture ?? 'unknown';
            } else if (adapter.requestAdapterInfo) {
              const info = await adapter.requestAdapterInfo();
              gpuVendor = info.vendor ?? 'unknown';
              gpuArchitecture = info.architecture ?? 'unknown';
            }
          }
        } catch {
          console.warn('[useDeviceCapability] Could not get GPU adapter info');
        }
      }

      // Step 5 — Model selection
      const { model, tier } = selectModel(ramGB, hasWebGPU);

      // Step 6 — Selection reason
      const selectionReason = buildSelectionReason(
        hasWebGPU,
        ramGB,
        tier,
        gpuVendor,
        gpuArchitecture
      );

      // Step 7 — Set profile (ALL variables now in scope)
      setProfile({
        ramGB,
        cpuCores,
        hasWebGPU,
        tier,
        selectedModel: model,
        gpuVendor,
        gpuArchitecture,
        selectionReason,
      });
    }

    detect();
  }, []);

  return profile;
}

function buildSelectionReason(
  hasWebGPU: boolean,
  ramGB: number,
  tier: 'low' | 'mid' | 'high',
  gpuVendor: string,
  gpuArchitecture: string
): string {
  if (!hasWebGPU) {
    return 'WebGPU unavailable — cannot load model';
  }

  const gpuLabel =
    gpuVendor !== 'unknown'
      ? `${gpuVendor} ${gpuArchitecture}`.trim()
      : 'GPU detected';

  switch (tier) {
    case 'low':
      return `${gpuLabel} · ${ramGB}GB RAM — lightweight model`;
    case 'mid':
      return `${gpuLabel} · ${ramGB}GB RAM — balanced model`;
    case 'high':
      return `${gpuLabel} · ${ramGB}GB RAM — full model`;
    default:
      return `${gpuLabel} · ${ramGB}GB RAM`;
  }
}