import type { FeatureExtractionPipeline } from '@xenova/transformers';

import { Message } from '@/lib/types';

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;
let resolvedEmbedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (resolvedEmbedder) return resolvedEmbedder;

  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      const extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      ) as FeatureExtractionPipeline;
      
      resolvedEmbedder = extractor;
      
      return extractor;
    })();
  }
  return embedderPromise;
}

export async function embed(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export async function rankByRelevance(
  messages: Message[],
  currentQuery: string
): Promise<Array<{ message: Message; score: number }>> {
  const queryEmbedding = await embed(currentQuery);

  const scored = await Promise.all(
    messages.map(async (msg) => {
      if (!msg.embedding) {
        msg.embedding = await embed(msg.content);
      }
      const score = cosineSimilarity(queryEmbedding, msg.embedding);
      return { message: msg, score };
    })
  );

  return scored.sort((a, b) => b.score - a.score);
}