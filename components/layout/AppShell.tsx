// components/layout/AppShell.tsx
'use client';

import { useState, useEffect } from 'react';
import { Conversation } from '@/lib/types';

interface Props {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function AppShell({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  children,
  headerRight,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Push the initial update to the next JS tick to satisfy strict ESLint rules
    setTimeout(() => {
      if (isMounted) setNow(Date.now());
    }, 0);

    // Auto-update the "time ago" text every minute
    const interval = setInterval(() => {
      if (isMounted) setNow(Date.now());
    }, 60000); 

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  function formatTime(ts: number): string {
    if (!now) return ''; // Return empty string during initial server render
    const diff = now - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40
        w-64 bg-zinc-950 border-r border-zinc-800
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar header */}
        <div className="p-3 border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm py-2.5 rounded-lg transition-colors border border-zinc-800"
          >
            <span className="text-lg leading-none">+</span>
            <span>New chat</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-zinc-700 text-xs text-center py-8 px-4">
              No conversations yet. Start chatting.
            </p>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`
                group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer
                transition-colors relative
                ${activeConversationId === conv.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}
              `}
              onClick={() => {
                onSelectConversation(conv.id);
                setSidebarOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate font-medium">
                  {conv.title}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {formatTime(conv.updatedAt)}
                </p>
              </div>

              {/* Delete button — only on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs flex-shrink-0 mt-0.5 transition-opacity"
                title="Delete conversation"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-zinc-800 flex-shrink-0">
          <p className="text-zinc-700 text-xs text-center">
            All data stays on this device
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ☰
          </button>
          <div className="flex-1" />
          {headerRight}
        </div>

        {/* Page content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}