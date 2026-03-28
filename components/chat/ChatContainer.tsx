'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, DeviceProfile } from '@/lib/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import {
  CONTEXT_TOKEN_BUDGET,
} from '@/lib/context/ContextManager';
import { useContextManager } from '@/hooks/useContextManager';
import { estimateMessageTokens } from '@/lib/context/tokenCounter';

interface Props {
  deviceProfile: DeviceProfile;
}

type ContextUsageState = {
  usedTokens: number;
  isNearLimit: boolean;
};

const EMPTY_CONTEXT_USAGE: ContextUsageState = {
  usedTokens: 0,
  isNearLimit: false,
};

export function ChatContainer({ deviceProfile }: Props) {
  const engine = useWebLLMEngine();
  const { addMessage, buildContext, clearMessages, getStats } = useContextManager();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextUsage, setContextUsage] = useState<ContextUsageState>(
    EMPTY_CONTEXT_USAGE
  );

  async function handleSend(content: string) {
    if (isStreaming) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      tokenEstimate: estimateMessageTokens('user', content),
    };

    addMessage(userMessage);
    const contextWindow = buildContext();
    const userStats = getStats();
    setContextUsage({
      usedTokens: contextWindow.totalTokens,
      isNearLimit: userStats.isNearLimit,
    });

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      tokenEstimate: 0,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

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

      const completedAssistant: Message = {
        ...assistantMessage,
        content: response,
        tokenEstimate: estimateMessageTokens('assistant', response),
      };
      addMessage(completedAssistant);

      const updatedContextWindow = buildContext();
      const stats = getStats();
      setContextUsage({
        usedTokens: updatedContextWindow.totalTokens,
        isNearLimit: stats.isNearLimit,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[ContextManager]', {
          totalMessages: stats.totalMessages,
          estimatedTokens: stats.estimatedTokens,
          evictedCount: updatedContextWindow.evictedCount,
          strategy: updatedContextWindow.evictionStrategy,
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
    setContextUsage(EMPTY_CONTEXT_USAGE);
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-medium">VoidChats</h1>
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 text-xs">
              {deviceProfile.selectedModel.displayName} - local
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

      <MessageList messages={messages} isStreaming={isStreaming} />

      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        isStreaming={isStreaming}
        contextTokensUsed={contextUsage.usedTokens}
        contextTokenBudget={CONTEXT_TOKEN_BUDGET}
        isNearLimit={contextUsage.isNearLimit}
      />
    </div>
  );
}
