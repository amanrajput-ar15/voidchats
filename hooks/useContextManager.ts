// hooks/useContextManager.ts
'use client';

import { useRef, useCallback } from 'react';
import { ContextManager } from '@/lib/context/ContextManager';
import { Message, ContextWindow } from '@/lib/types';

export function useContextManager() {
  // useRef so ContextManager survives re-renders without triggering them
  const managerRef = useRef<ContextManager>(new ContextManager());

  const addMessage = useCallback((message: Message) => {
    managerRef.current.addMessage(message);
  }, []);

  // FIFO — synchronous, used as fallback
  const buildContext = useCallback((): ContextWindow => {
    return managerRef.current.buildContext();
  }, []);

  // SEMANTIC — async, primary method from Day 5 onwards
  const buildContextSemantic = useCallback(
    async (currentQuery: string): Promise<ContextWindow> => {
      return managerRef.current.buildContextSemantic(currentQuery);
    },
    []
  );

  const clearMessages = useCallback(() => {
    managerRef.current.clearMessages();
  }, []);

  const getStats = useCallback(() => {
    return managerRef.current.getStats();
  }, []);

  return {
    addMessage,
    buildContext,
    buildContextSemantic,
    clearMessages,
    getStats,
  };
}