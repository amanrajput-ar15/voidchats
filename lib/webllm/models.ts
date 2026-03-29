// lib/webllm/models.ts
import { ModelConfig } from '@/lib/types';

export const MODELS: Record<string, ModelConfig> = {
  low: {
    id: 'SmolLM2-360M-Instruct-q0f16-MLC',
    displayName: 'SmolLM2 360M',
    sizeGB: 0.4,
    quantization: '4bit',
    minRAMGB: 2,
    requiresWebGPU: true,
  },
  mid: {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 1B',
    sizeGB: 0.8,
    quantization: '4bit',
    minRAMGB: 4,
    requiresWebGPU: true,
  },
  high: {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    displayName: 'Qwen 2.5 3B',
    sizeGB: 1.9,
    quantization: '4bit',
    minRAMGB: 8,
    requiresWebGPU: true,
  },
};

/**
 * Selects model tier based on device capability.
 *
 * Thresholds:
 * - No WebGPU OR RAM < 4GB  → low  (SmolLM2 360M, 0.4GB)
 * - WebGPU AND RAM 4–7GB    → mid  (Llama 1B, 0.8GB)
 * - WebGPU AND RAM >= 8GB   → high (Qwen 3B, 1.9GB)
 */
export function selectModel(
  ramGB: number,
  hasWebGPU: boolean
): { model: ModelConfig; tier: 'low' | 'mid' | 'high' } {
  if (!hasWebGPU || ramGB < 4) {
    return { model: MODELS['low'], tier: 'low' };
  }
  if (ramGB < 8) {
    return { model: MODELS['mid'], tier: 'mid' };
  }
  return { model: MODELS['high'], tier: 'high' };
}