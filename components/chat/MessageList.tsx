// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">
          Your conversation stays on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant' | 'system'}
            content={msg.content}
            isStreaming={
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === 'assistant'
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}