// lib/context/tokenCounter.ts

/**
 * Estimates token count for a string.
 * Rule of thumb: ~4 characters per token for English text.
 * Good enough without running tiktoken in-browser.
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