export enum ModelStatus {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  READY = 'ready',
  INFERRING = 'inferring',
  UNLOADING = 'unloading',
  ERROR = 'error',
}

export interface ModelConfig {
  id: string;
  displayName: string;
  sizeGB: number;
  quantization: '4bit' | '8bit';
  minRAMGB: number;
  requiresWebGPU: boolean;
}

export interface DeviceProfile {
  ramGB: number;
  cpuCores: number;
  hasWebGPU: boolean;
  tier: 'low' | 'mid' | 'high';
  selectedModel: ModelConfig;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenEstimate: number;
  embedding?: number[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelUsed: string;
}

export interface ContextWindow {
  messages: Message[];
  totalTokens: number;
  evictedCount: number;
  evictionStrategy: 'semantic' | 'fifo' | 'none';
}

export interface UseWebLLMReturn {
  status: ModelStatus;
  loadProgress: number;
  loadStatusText: string;
  deviceProfile: DeviceProfile | null;
  loadModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  sendMessage: (context: ContextWindow) => AsyncGenerator<string>;
  currentModel: ModelConfig | null;
  tokensPerSecond: number | null;
}