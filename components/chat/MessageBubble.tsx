'use client';

interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming = false }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-white text-black rounded-br-sm'
            : 'bg-zinc-900 text-zinc-100 rounded-bl-sm'
          }
        `}
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-zinc-400 ml-1 align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}