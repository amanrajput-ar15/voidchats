// components/chat/ChatContainer.tsx
'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, DeviceProfile } from '@/lib/types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';

interface Props {
  deviceProfile: DeviceProfile;
}

const SYSTEM_MESSAGE: Message = {
  id: 'system-0',
  role: 'system',
  content: 'You are a helpful, private AI assistant running entirely on the user\'s device. Be concise and accurate.',
  timestamp: Date.now(),
  tokenEstimate: 20,
};

export function ChatContainer({ deviceProfile }: Props) {
  const engine = useWebLLMEngine();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSend(content: string) {
    if (isStreaming) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      tokenEstimate: Math.ceil(content.length / 4),
    };

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      tokenEstimate: 0,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantMessage]);
    setIsStreaming(true);

    // Build context for engine: system + conversation history
    const context = [SYSTEM_MESSAGE, ...updatedMessages].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      let response = '';
      for await (const token of engine.streamCompletion(context)) {
        response += token;
        setMessages([
          ...updatedMessages,
          {
            ...assistantMessage,
            content: response,
            tokenEstimate: Math.ceil(response.length / 4),
          },
        ]);
      }
    } catch (err) {
      setMessages([
        ...updatedMessages,
        {
          ...assistantMessage,
          content: `Error: ${String(err)}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-medium">VoidChats</h1>
          <span className="text-zinc-500 text-xs">
            {deviceProfile.selectedModel.displayName} · local
          </span>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}