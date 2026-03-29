// components/chat/ChatContainer.tsx
'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, DeviceProfile } from '@/lib/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import { useContextManager } from '@/hooks/useContextManager';
import { estimateMessageTokens, CONTEXT_TOKEN_BUDGET } from '@/lib/context/tokenCounter';

interface Props {
  deviceProfile: DeviceProfile;
}

export function ChatContainer({ deviceProfile }: Props) {
  const engine = useWebLLMEngine();
  const {
    addMessage,
    buildContextSemantic,
    clearMessages,
    getStats,
  } = useContextManager();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBuildingContext, setIsBuildingContext] = useState(false);
  const [lastEvictionStrategy, setLastEvictionStrategy] = useState('none');
  const [lastEvictedCount, setLastEvictedCount] = useState(0);

  async function handleSend(content: string) {
    if (isStreaming || isBuildingContext) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      tokenEstimate: estimateMessageTokens('user', content),
    };

    // Add user message to context manager
    addMessage(userMessage);

    // Build semantic context window
    setIsBuildingContext(true);
    const contextWindow = await buildContextSemantic(content);
    setIsBuildingContext(false);

    // Track eviction stats
    setLastEvictionStrategy(contextWindow.evictionStrategy);
    setLastEvictedCount(contextWindow.evictedCount);

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      tokenEstimate: 0,
    };

    // Update UI immediately
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    // Build engine messages: system prompt + context window
    const engineMessages = [
      {
        role: 'system' as const,
        content:
          "You are a helpful, private AI assistant running entirely on the user's device. Be concise and accurate.",
      },
      ...contextWindow.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    try {
      let response = '';

      for await (const token of engine.streamCompletion(engineMessages)) {
        response += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...assistantMessage,
            content: response,
            tokenEstimate: estimateMessageTokens('assistant', response),
          };
          return updated;
        });
      }

      // Add completed assistant message to context manager
      const completedAssistant: Message = {
        ...assistantMessage,
        content: response,
        tokenEstimate: estimateMessageTokens('assistant', response),
      };
      addMessage(completedAssistant);

      // Log context stats in development
      if (process.env.NODE_ENV === 'development') {
        const stats = getStats();
        console.log('[ContextManager]', {
          totalMessages: stats.totalMessages,
          estimatedTokens: stats.estimatedTokens,
          evictedCount: contextWindow.evictedCount,
          strategy: contextWindow.evictionStrategy,
          isNearLimit: stats.isNearLimit,
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...assistantMessage,
          content: `Error: ${String(err)}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleClear() {
    clearMessages();
    setMessages([]);
    setLastEvictionStrategy('none');
    setLastEvictedCount(0);
  }

  const stats = getStats();

  return (
    <div className="flex flex-col h-screen bg-black">

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-medium">VoidChats</h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 text-xs">
              {deviceProfile.selectedModel.displayName} · local
            </span>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || isBuildingContext}
        isStreaming={isStreaming}
        isBuildingContext={isBuildingContext}
        usedTokens={stats.estimatedTokens}
        tokenBudget={CONTEXT_TOKEN_BUDGET}
        isNearLimit={stats.isNearLimit}
        evictionStrategy={lastEvictionStrategy}
        evictedCount={lastEvictedCount}
      />
    </div>
  );
}