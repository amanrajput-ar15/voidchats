// hooks/useDeviceCapability.ts
'use client';

import { useState, useEffect } from 'react';
import { DeviceProfile } from '@/lib/types';
import { selectModel } from '@/lib/webllm/models';

// Extend Navigator for non-standard properties
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
}

// Minimal GPU adapter types
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

      // RAM — navigator.deviceMemory returns coarse value
      // Possible values: 0.25, 0.5, 1, 2, 4, 8
      // Returns undefined in Firefox — default to 4
      const ramGB = nav.deviceMemory ?? 4;

      // CPU cores
      const cpuCores = navigator.hardwareConcurrency ?? 4;

      // WebGPU availability
      const gpu = (navigator as Navigator & { gpu?: GPUInstance }).gpu;
      const hasWebGPU = !!gpu;

      // GPU vendor + architecture from WebGPU adapter
      let gpuVendor = 'unknown';
      let gpuArchitecture = 'unknown';

      if (hasWebGPU && gpu) {
        try {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            // Try adapter.info first (Chrome 121+)
            if (adapter.info) {
              gpuVendor = adapter.info.vendor ?? 'unknown';
              gpuArchitecture = adapter.info.architecture ?? 'unknown';
            }
            // Fall back to requestAdapterInfo() (older API)
            else if (adapter.requestAdapterInfo) {
              const info = await adapter.requestAdapterInfo();
              gpuVendor = info.vendor ?? 'unknown';
              gpuArchitecture = info.architecture ?? 'unknown';
            }
          }
        } catch {
          // Non-fatal — GPU info unavailable
          console.warn(
            '[useDeviceCapability] Could not get GPU adapter info'
          );
        }
      }

      // Model selection
      const { model, tier } = selectModel(ramGB, hasWebGPU);

      // Human-readable selection reason for loading screen
      const selectionReason = buildSelectionReason(
        hasWebGPU,
        ramGB,
        tier,
        gpuVendor,
        gpuArchitecture
      );

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