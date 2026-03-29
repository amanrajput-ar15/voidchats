// lib/context/tokenCounter.ts

export const CONTEXT_TOKEN_BUDGET = 1500;

/**
 * Estimates token count for a string.
 * Rule of thumb: ~4 characters per token for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimates tokens for a full message including role overhead.
 * Each message has ~4 tokens of overhead for role + formatting.
 */
export function estimateMessageTokens(
  role: string,
  content: string
): number {
  return estimateTokens(content) + 4;
} 