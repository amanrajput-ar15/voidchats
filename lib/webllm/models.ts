import { ModelConfig } from '@/lib/types';

export const MODELS: Record<string, ModelConfig> = {
  low: {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 1B (4-bit)',
    sizeGB: 0.8,
    quantization: '4bit',
    minRAMGB: 2,
    requiresWebGPU: true,
  },
  mid: {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 1B (4-bit)',
    sizeGB: 0.8,
    quantization: '4bit',
    minRAMGB: 4,
    requiresWebGPU: true,
  },
  high: {
    id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC',
    displayName: 'Qwen 2.5 3B (4-bit)',
    sizeGB: 1.9,
    quantization: '4bit',
    minRAMGB: 8,
    requiresWebGPU: true,
  },
};

export function selectModel(
  ramGB: number,
  hasWebGPU: boolean
): { model: ModelConfig; tier: 'low' | 'mid' | 'high' } {
  if (!hasWebGPU || ramGB < 4) return { model: MODELS['low'], tier: 'low' };
  if (ramGB < 8) return { model: MODELS['mid'], tier: 'mid' };
  return { model: MODELS['high'], tier: 'high' };
}