// components/chat/ChatContainer.tsx
'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Tutorial Update: Imported Conversation
import { Message, DeviceProfile, Conversation } from '@/lib/types'; 
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { DevInfoPanel } from '@/components/ui/DevInfoPanel';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import { useContextManager } from '@/hooks/useContextManager';
import { useConversation } from '@/hooks/useConversation';
import { useBattery } from '@/hooks/useBattery';
import {
  estimateMessageTokens,
  CONTEXT_TOKEN_BUDGET,
} from '@/lib/context/tokenCounter';

// Tutorial Update: Added Sync imports
import { SyncToggle } from '@/components/ui/SyncToggle';
import { syncConversation } from '@/lib/storage/sync';

interface Props {
  deviceProfile: DeviceProfile;
}

interface InferenceStats {
  tokensPerSecond: number | null;
  lastLatencyMs: number | null;
  totalTokensGenerated: number;
}

export function ChatContainer({ deviceProfile }: Props) {
  const engine = useWebLLMEngine();
  const { addMessage, buildContextSemantic, clearMessages, getStats } =
    useContextManager();
  const { createConversation, addMessageToConversation } = useConversation();
  const battery = useBattery();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBuildingContext, setIsBuildingContext] = useState(false);
  const [lastEvictionStrategy, setLastEvictionStrategy] = useState('none');
  const [lastEvictedCount, setLastEvictedCount] = useState(0);
  const [inferenceStats, setInferenceStats] = useState<InferenceStats>({
    tokensPerSecond: null,
    lastLatencyMs: null,
    totalTokensGenerated: 0,
  });

  const currentConvIdRef = useRef<string | null>(null);

  // --- TUTORIAL UPDATE: State Variables ---
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const passphraseRef = useRef<string | null>(
    typeof window !== 'undefined'
      ? sessionStorage.getItem('vc-passphrase')
      : null
  );

  // --- TUTORIAL UPDATE: Helper Function ---
  async function syncIfEnabled(conversation: Conversation) {
    if (!syncEnabled || !passphraseRef.current || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncConversation(conversation, passphraseRef.current);
      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn('[Sync] Failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleSend(content: string) {
    if (isStreaming || isBuildingContext) return;

    if (battery.isCritical) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: Date.now(),
          tokenEstimate: 0,
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content:
            'Battery critically low. Please charge your device before continuing.',
          timestamp: Date.now(),
          tokenEstimate: 0,
        },
      ]);
      return;
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      tokenEstimate: estimateMessageTokens('user', content),
    };

    if (!currentConvIdRef.current) {
      const conv = await createConversation(deviceProfile.selectedModel.id);
      currentConvIdRef.current = conv.id;
    }

    await addMessageToConversation(currentConvIdRef.current, userMessage);
    addMessage(userMessage);

    setIsBuildingContext(true);
    const contextWindow = await buildContextSemantic(content);
    setIsBuildingContext(false);

    setLastEvictionStrategy(contextWindow.evictionStrategy);
    setLastEvictedCount(contextWindow.evictedCount);

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
      const sendTime = Date.now();
      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      for await (const token of engine.streamCompletion(engineMessages)) {
        if (firstTokenTime === null) firstTokenTime = Date.now();
        tokenCount++;
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

      const endTime = Date.now();
      const durationSec =
        (endTime - (firstTokenTime ?? sendTime)) / 1000;
      const tps =
        durationSec > 0 ? Math.round(tokenCount / durationSec) : null;
      const latencyMs = firstTokenTime ? firstTokenTime - sendTime : null;

      setInferenceStats((prev) => ({
        tokensPerSecond: tps,
        lastLatencyMs: latencyMs,
        totalTokensGenerated: prev.totalTokensGenerated + tokenCount,
      }));

      const completedAssistant: Message = {
        ...assistantMessage,
        content: response,
        tokenEstimate: estimateMessageTokens('assistant', response),
      };

      addMessage(completedAssistant);

      if (currentConvIdRef.current) {
        await addMessageToConversation(
          currentConvIdRef.current,
          completedAssistant
        );

        // --- TUTORIAL UPDATE: Call sync after persisting ---
        const activeConv = {
          id: currentConvIdRef.current!,
          modelUsed: deviceProfile.selectedModel.id,
          messages: [], // sync uses encrypted blob — messages in blob
          title: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await syncIfEnabled(activeConv as Conversation);
      }

      if (process.env.NODE_ENV === 'development') {
        const stats = getStats();
        console.log('[ContextManager]', {
          totalMessages: stats.totalMessages,
          estimatedTokens: stats.estimatedTokens,
          evictedCount: contextWindow.evictedCount,
          strategy: contextWindow.evictionStrategy,
          isNearLimit: stats.isNearLimit,
        });
        console.log('[Inference]', {
          tokensPerSecond: tps,
          latencyMs,
          totalTokens: tokenCount,
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
    currentConvIdRef.current = null;
  }

  const stats = getStats();

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Battery warning */}
      {battery.isLowBattery && (
        <div className="bg-amber-950 border-b border-amber-800 px-6 py-2 flex-shrink-0">
          <p className="text-amber-400 text-xs text-center max-w-3xl mx-auto">
            Battery low ({Math.round(battery.level * 100)}%) —
            connect charger for best performance
          </p>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-medium">VoidChats</h1>
          <div className="flex items-center gap-4">
            

            <SyncToggle
              onSyncEnabledChange={setSyncEnabled}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
            />

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

      {/* Dev info panel */}
      <DevInfoPanel
        deviceProfile={deviceProfile}
        battery={battery}
        inferenceStats={inferenceStats}
        contextStats={stats}
        lastEvictionStrategy={lastEvictionStrategy}
        lastEvictedCount={lastEvictedCount}
      />
    </div>
  );
}