'use client';

import { createContext, useContext, ReactNode } from 'react';
import { webLLMEngine } from '@/lib/webllm/engine';

const WebLLMContext = createContext(webLLMEngine);

export function WebLLMProvider({ children }: { children: ReactNode }) {
  return (
    <WebLLMContext.Provider value={webLLMEngine}>
      {children}
    </WebLLMContext.Provider>
  );
}

export function useWebLLMEngine() {
  return useContext(WebLLMContext);
}