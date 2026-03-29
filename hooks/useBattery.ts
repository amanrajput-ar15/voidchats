// hooks/useBattery.ts
'use client';

import { useState, useEffect } from 'react';

export interface BatteryState {
  isCharging: boolean;
  level: number;
  isLowBattery: boolean;
  isCritical: boolean;
  isSupported: boolean;
}

const DEFAULT_STATE: BatteryState = {
  isCharging: true,
  level: 1,
  isLowBattery: false,
  isCritical: false,
  isSupported: false, // Defaults to false
};

// 1. Define the missing browser API types strictly
interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

// Extend the Navigator interface locally
interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>(DEFAULT_STATE);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;

    // 2. FIX: No synchronous setState needed. State is already DEFAULT.
    if (!nav.getBattery) {
      return; 
    }

    let battery: BatteryManager | null = null;

    function updateState(b: BatteryManager) {
      setState({
        isCharging: b.charging,
        level: b.level,
        isLowBattery: b.level < 0.2 && !b.charging,
        isCritical: b.level < 0.1 && !b.charging,
        isSupported: true,
      });
    }

    // 3. FIX: Create a stable reference for the event listener to prevent memory leaks
    const handleBatteryChange = () => {
      if (battery) updateState(battery);
    };

    nav.getBattery().then((b) => {
      battery = b;
      updateState(b);
      // Attach the named listener
      b.addEventListener('chargingchange', handleBatteryChange);
      b.addEventListener('levelchange', handleBatteryChange);
    });

    return () => {
      if (battery) {
        // Safely detach using the EXACT same reference
        battery.removeEventListener('chargingchange', handleBatteryChange);
        battery.removeEventListener('levelchange', handleBatteryChange);
      }
    };
  }, []);

  return state;
}