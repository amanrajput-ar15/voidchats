'use client';

import { useRef, useCallback } from 'react';
import { ContextManager } from '@/lib/context/ContextManager';
import { Message, ContextWindow } from '@/lib/types';

export function useContextManager() {
  const managerRef = useRef<ContextManager>(new ContextManager());

  const addMessage = useCallback((message: Message) => {
    managerRef.current.addMessage(message);
  }, []);

  const buildContext = useCallback((): ContextWindow => {
    return managerRef.current.buildContext();
  }, []);
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