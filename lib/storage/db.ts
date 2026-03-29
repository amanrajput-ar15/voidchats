// lib/storage/db.ts
import { openDB, IDBPDatabase } from 'idb';
import { Conversation } from '@/lib/types';

const DB_NAME = 'voidchats-db';
const DB_VERSION = 1;

// TypeScript schema for IndexedDB structure
interface VoidChatsDB {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updatedAt': number };
  };
}

// Singleton DB instance — opened once, reused
// NEVER initialize at module level — runs during SSR and crashes
let dbInstance: IDBPDatabase<VoidChatsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VoidChatsDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VoidChatsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', {
          keyPath: 'id',
        });
        store.createIndex('by-updatedAt', 'updatedAt');
      }
    },
  });

  return dbInstance;
}

/**
 * Saves or updates a conversation.
 * Uses put() — upsert semantics (insert or replace by id).
 */
export async function saveConversation(
  conversation: Conversation
): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

/**
 * Loads all conversations sorted by most recently updated.
 * Returns newest first.
 */
export async function loadConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('conversations', 'by-updatedAt');
  return all.reverse();
}

/**
 * Loads a single conversation by ID.
 */
export async function loadConversation(
  id: string
): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

/**
 * Deletes a conversation by ID.
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}

/**
 * Deletes all conversations.
 */
export async function clearAllConversations(): Promise<void> {
  const db = await getDB();
  await db.clear('conversations');
}

/**
 * Generates a conversation title from the first user message.
 * Truncates to 50 characters.
 */
export function generateTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.slice(0, 47) + '...';
}