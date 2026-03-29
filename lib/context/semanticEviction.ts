import type { FeatureExtractionPipeline } from '@xenova/transformers';

// lib/context/semanticEviction.ts

import { Message } from '@/lib/types';


// Singleton embedder promise — created once, reused forever
// NEVER import @xenova/transformers at top level — 40MB bundle penalty
let embedderPromise: Promise <FeatureExtractionPipeline> | null = null;

/**
 * Returns the MiniLM embedder pipeline.
 * Lazy-loaded on first call — downloads ~25MB model on first use.
 * Cached after first load — subsequent calls return instantly.
 */
async function getEmbedder(): Promise <FeatureExtractionPipeline> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      // Dynamic import — CRITICAL. Never move this to top of file.
      const { pipeline } = await import('@xenova/transformers');
      return await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    })();
  }
  return embedderPromise;
}

/**
 * Computes a 384-dimensional embedding vector for a text string.
 *
 * Model: all-MiniLM-L6-v2
 * - 22M parameters
 * - ~25MB download (cached in browser after first use)
 * - 384-dimensional output
 * - normalize: true → unit vectors → dot product = cosine similarity
 */
export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

/**
 * Cosine similarity between two normalized vectors.
 *
 * Since both vectors are unit vectors (normalize: true above),
 * cosine_similarity(A, B) = A · B = dot product.
 *
 * Range: -1 (completely opposite) to 1 (identical).
 * Higher score = more semantically similar to the query.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Ranks messages by semantic relevance to the current query.
 *
 * Algorithm:
 * 1. Embed the current query
 * 2. For each message: embed if not cached, compute similarity to query
 * 3. Sort by similarity descending (most relevant first)
 *
 * Embeddings are cached on the Message object (msg.embedding).
 * This means each message is only embedded once per session.
 *
 * Returns array sorted by score descending.
 */
export async function rankByRelevance(
  messages: Message[],
  currentQuery: string
): Promise<Array<{ message: Message; score: number }>> {
  // Embed the current user query
  const queryEmbedding = await embed(currentQuery);

  // Embed each message (use cached embedding if available)
  const scored = await Promise.all(
    messages.map(async (msg) => {
      // Use cached embedding if already computed
      if (!msg.embedding) {
        msg.embedding = await embed(msg.content);
      }
      const score = cosineSimilarity(queryEmbedding, msg.embedding);
      return { message: msg, score };
    })
  );

  // Sort by relevance score descending
  return scored.sort((a, b) => b.score - a.score);
}