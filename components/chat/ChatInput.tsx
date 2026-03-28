// components/chat/ChatInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  isStreaming: boolean;
  contextTokensUsed: number;
  contextTokenBudget: number;
  isNearLimit: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  contextTokensUsed,
  contextTokenBudget,
  isNearLimit,
}: Props) {
  const [input, setInput] = useState('');

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-zinc-800 px-6 py-4">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message VoidChats..."
          rows={1}
          className="
            flex-1 bg-zinc-900 text-white text-sm px-4 py-3 rounded-xl
            border border-zinc-800 focus:outline-none focus:border-zinc-600
            placeholder-zinc-600 transition-colors resize-none
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{
            minHeight: '48px',
            maxHeight: '160px',
            height: 'auto',
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="
            bg-white text-black text-sm font-medium px-5 py-3 rounded-xl
            hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors flex-shrink-0
          "
        >
          {isStreaming ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
      <div className="max-w-3xl mx-auto mt-2 flex items-center justify-between gap-3 text-xs">
        <p className={isNearLimit ? 'text-amber-400' : 'text-zinc-700'}>
          Context: {contextTokensUsed} / {contextTokenBudget} tokens
        </p>
        <p className="text-zinc-700 text-right">
          Enter to send - Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
