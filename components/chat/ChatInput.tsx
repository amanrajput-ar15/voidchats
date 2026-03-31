'use client';

import { useState, KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  isStreaming: boolean;
  isBuildingContext: boolean;
  usedTokens: number;
  tokenBudget: number;
  isNearLimit: boolean;
  evictionStrategy: string;
  evictedCount: number;
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  isBuildingContext,
  usedTokens,
  tokenBudget,
  isNearLimit,
  evictionStrategy,
  evictedCount,
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

  // Footer status text
  function getStatusText(): string {
    if (isBuildingContext) return 'Building context...';
    if (isStreaming) return 'Thinking...';
    if (evictionStrategy === 'semantic' && evictedCount > 0) {
      return `${evictedCount} messages evicted (semantic)`;
    }
    if (evictionStrategy === 'fifo' && evictedCount > 0) {
      return `${evictedCount} messages evicted (fifo)`;
    }
    return 'Enter to send · Shift+Enter for new line';
  }

  return (
    <div className="border-t border-zinc-800 px-6 py-4 flex-shrink-0">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isBuildingContext
              ? 'Building context...'
              : 'Message VoidChats...'
          }
          rows={1}
          className="
            flex-1 bg-zinc-900 text-white text-sm px-4 py-3 rounded-xl
            border border-zinc-800 focus:outline-none focus:border-zinc-600
            placeholder-zinc-600 transition-colors resize-none
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{ minHeight: '48px', maxHeight: '160px' }}
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
          {isStreaming || isBuildingContext ? (
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

      {/* Footer: token usage + status */}
      <div className="max-w-3xl mx-auto flex items-center justify-between mt-2">
        <p
          className={`text-xs transition-colors ${
            isBuildingContext
              ? 'text-zinc-400'
              : evictedCount > 0
              ? 'text-amber-600'
              : 'text-zinc-700'
          }`}
        >
          {getStatusText()}
        </p>
        <p
          className={`text-xs font-mono flex-shrink-0 ${
            isNearLimit ? 'text-amber-500' : 'text-zinc-700'
          }`}
        >
          {usedTokens} / {tokenBudget}
        </p>
      </div>
    </div>
  );
}
