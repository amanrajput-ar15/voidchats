// hooks/useDeviceCapability.ts
'use client';

import { useState, useEffect } from 'react';
import { DeviceProfile } from '@/lib/types';
import { selectModel } from '@/lib/webllm/models';

export function useDeviceCapability(): DeviceProfile | null {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);

  useEffect(() => {
    async function detect() {
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        gpu?: unknown;
      };

      const ramGB = nav.deviceMemory ?? 4;
      const cpuCores = navigator.hardwareConcurrency ?? 4;
      const hasWebGPU = !!nav.gpu;

      const { model, tier } = selectModel(ramGB, hasWebGPU);

      setProfile({
        ramGB,
        cpuCores,
        hasWebGPU,
        tier,
        selectedModel: model,
      });
    }

    detect();
  }, []);

  return profile;
}