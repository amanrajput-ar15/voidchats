// lib/storage/sync.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Conversation } from '@/lib/types';
import { 
  encrypt, 
  serializeEncrypted, 
  decrypt, 
  deserializeEncrypted 
} from './encryption';
import { loadConversation, saveConversation } from './db';

// Singleton instance to prevent creating multiple websocket connections
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    );
  }
  
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

/**
 * Signs in anonymously — creates a session without credentials.
 * Each device gets a unique ID. Conversations are tied to this ID via RLS.
 */
export async function ensureAuth(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) return session.user.id;
  
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Auth failed: ${error?.message}`);
  }
  return data.user.id;
}

/**
 * Syncs a single conversation to Supabase.
 * Server only ever stores encrypted blobs — never plaintext.
 */
export async function syncConversation(
  conversation: Conversation,
  passphrase: string
): Promise<void> {
  const supabase = getSupabase();
  await ensureAuth();
  
  const json = JSON.stringify(conversation);
  const { ciphertext, iv, salt } = await encrypt(json, passphrase);
  const blob = serializeEncrypted(ciphertext, iv, salt);
  
  const { error } = await supabase.from('conversations').upsert(
    {
      id: conversation.id,
      encrypted_blob: blob,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' } // Upsert semantics: Insert or Update
  );
  
  if (error) throw new Error(`Sync failed: ${error.message}`);
}

/**
 * Fetches all encrypted conversation blobs from Supabase.
 * Returns raw base64 strings — caller must decrypt.
 */
export async function fetchRemoteConversations(): Promise<Array<{ id: string; encrypted_blob: string }>> {
  const supabase = getSupabase();
  await ensureAuth();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('id, encrypted_blob')
    .order('updated_at', { ascending: false });
    
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data ?? [];
}

/**
 * Deletes a conversation from Supabase by ID.
 */
export async function deleteRemoteConversation(id: string): Promise<void> {
  const supabase = getSupabase();
  await ensureAuth();
  
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/**
 * Fetches remote conversations, decrypts, merges into local IndexedDB.
 * Conflict resolution: Last-Write-Wins (remote wins if newer).
 * Called on Day 16 from the conversation sidebar restore button.
 */
export async function syncDownAndMerge(
  passphrase: string
): Promise<{ restored: number; failed: number }> {
  const remoteBlobs = await fetchRemoteConversations();
  let restoredCount = 0;
  let failedCount = 0;

  for (const remote of remoteBlobs) {
    try {
      const { ciphertext, iv, salt } = deserializeEncrypted(
        remote.encrypted_blob
      );
      const decryptedJson = await decrypt(ciphertext, iv, salt, passphrase);
      const remoteConv = JSON.parse(decryptedJson);
      
      const localConv = await loadConversation(remoteConv.id);
      
      // LWW: overwrite local only if remote is newer or local missing
      if (!localConv || remoteConv.updatedAt > localConv.updatedAt) {
        await saveConversation(remoteConv);
        restoredCount++;
      }
    } catch (err) {
      console.error(
        `[SyncDown] Failed to decrypt conversation ${remote.id}:`,
        err
      );
      failedCount++;
    }
  }

  return { restored: restoredCount, failed: failedCount };
}