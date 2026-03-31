// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/types';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onSuggestedPrompt?: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  'Explain how WebGPU works',
  'Write a Python function to sort a list',
  'What is the difference between RAM and VRAM?',
  'Help me debug this code',
];

export function MessageList({ messages, isStreaming, onSuggestedPrompt }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The Empty State UI
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-white text-xl font-semibold mb-2">
            VoidChats
          </h2>
          <p className="text-zinc-600 text-sm">
            Private AI — no internet required after first load
          </p>
        </div>

        {onSuggestedPrompt && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSuggestedPrompt(prompt)}
                className="text-left px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 text-xs transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // The Standard Message List UI
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
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