'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message } from '@/lib/types';
import {
  saveConversation,
  loadConversations,
  deleteConversation,
  generateTitle,
} from '@/lib/storage/db';
import { v4 as uuidv4 } from 'uuid';

export function useConversation() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const loaded = await loadConversations();
        setConversations(loaded);
        if (loaded.length > 0) {
          setActiveConversationId(loaded[0].id);
        }
      } catch (err) {
        console.error('[useConversation] Failed to load:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  /**
    Creates a new empty conversation and persists it immediately.
    Returns the new conversation object.
   */
  const createConversation = useCallback(
    async (modelUsed: string): Promise<Conversation> => {
      const conversation: Conversation = {
        id: uuidv4(),
        title: 'New conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelUsed,
      };
      await saveConversation(conversation);
      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      return conversation;
    },
    []
  );

  /**
   Adds a message to a conversation and persists.
   Auto-titles the conversation from the first user message.
   *Non-blocking — UI updates immediately, DB write is fire-and-forget.
   */
  const addMessageToConversation = useCallback(
    async (conversationId: string, message: Message): Promise<void> => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id !== conversationId) return conv;

          const updatedMessages = [...conv.messages, message];
          const updatedConv: Conversation = {
            ...conv,
            messages: updatedMessages,
            updatedAt: Date.now(),
            // Auto-title from first user message only
            title:
              conv.messages.length === 0 && message.role === 'user'
                ? generateTitle(message.content)
                : conv.title,
          };

          // Persist to IndexedDB — fire and forget
          saveConversation(updatedConv).catch((err) =>
            console.error('[useConversation] Save failed:', err)
          );

          return updatedConv;
        });
        return updated;
      });
    },
    []
  );

  /**
    Deletes a conversation from state and IndexedDB.
   */
  const removeConversation = useCallback(
    async (id: string): Promise<void> => {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveConversationId((current) => {
        if (current !== id) return current;
        return null;
      });
    },
    []
  );

  /**
    Returns the currently active conversation or null.
   */
  const getActiveConversation = useCallback((): Conversation | null => {
    if (!activeConversationId) return null;
    return (
      conversations.find((c) => c.id === activeConversationId) ?? null
    );
  }, [conversations, activeConversationId]);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isLoading,
    createConversation,
    addMessageToConversation,
    removeConversation,
    getActiveConversation,
  };
}