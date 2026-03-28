// hooks/useContextManager.ts
'use client';

import { useRef, useCallback } from 'react';
import { ContextManager } from '@/lib/context/ContextManager';
import { Message, ContextWindow } from '@/lib/types';

export function useContextManager() {
  // Ref so it survives re-renders without triggering them
  const managerRef = useRef<ContextManager>(new ContextManager());

  const addMessage = useCallback((message: Message) => {
    managerRef.current.addMessage(message);
  }, []);

  const buildContext = useCallback((): ContextWindow => {
    return managerRef.current.buildContext();
  }, []);

  const clearMessages = useCallback(() => {
    managerRef.current.clearMessages();
  }, []);

  const getStats = useCallback(() => {
    return managerRef.current.getStats();
  }, []);

  return {
    addMessage,
    buildContext,
    clearMessages,
    getStats,
  };
}