export const CONTEXT_TOKEN_BUDGET = 1500;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessageTokens(
  role: string,
  content: string
): number {
  return estimateTokens(content) + 4;
}