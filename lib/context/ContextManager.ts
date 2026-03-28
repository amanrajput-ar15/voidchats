// lib/context/ContextManager.ts
import { Message, ContextWindow } from '@/lib/types';
import { estimateMessageTokens } from './tokenCounter';

export const CONTEXT_TOKEN_BUDGET = 1500;

export class ContextManager {
  private messages: Message[] = [];

  // Token budget - leave room for system prompt + response
  private readonly TOKEN_BUDGET = CONTEXT_TOKEN_BUDGET;

  // Always keep last N exchanges regardless of token count
  private readonly RECENCY_ANCHOR = 2;

  private readonly SYSTEM_PROMPT =
    "You are a helpful, private AI assistant running entirely on the user's device. Be concise and accurate.";

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  /**
   * FIFO eviction - builds context window within token budget.
   * Always keeps: system prompt + last RECENCY_ANCHOR exchanges.
   * Fills remaining budget with older messages first.
   * Evicts from the middle when over budget.
   */
  buildContext(): ContextWindow {
    const systemTokens = estimateMessageTokens('system', this.SYSTEM_PROMPT);
    const budget = this.TOKEN_BUDGET - systemTokens;

    if (this.messages.length === 0) {
      return {
        messages: [],
        totalTokens: systemTokens,
        evictedCount: 0,
        evictionStrategy: 'none',
      };
    }

    // Always include recent messages (recency anchor)
    const anchorCount = this.RECENCY_ANCHOR * 2; // user + assistant pairs
    const recentMessages = this.messages.slice(-anchorCount);
    const olderMessages = this.messages.slice(0, -anchorCount);

    const recentTokens = recentMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m.role, m.content),
      0
    );

    // Edge case: recent messages alone exceed budget
    if (recentTokens >= budget) {
      return {
        messages: recentMessages.slice(-2), // keep at least last exchange
        totalTokens: recentMessages.slice(-2).reduce(
          (sum, m) => sum + estimateMessageTokens(m.role, m.content),
          systemTokens
        ),
        evictedCount: this.messages.length - 2,
        evictionStrategy: 'fifo',
      };
    }

    // Fill remaining budget with older messages (FIFO - keep newest)
    let remainingBudget = budget - recentTokens;
    const selected: Message[] = [];

    // Iterate from most recent older message backwards
    for (let i = olderMessages.length - 1; i >= 0; i--) {
      const msg = olderMessages[i];
      const tokens = estimateMessageTokens(msg.role, msg.content);
      if (tokens <= remainingBudget) {
        selected.unshift(msg); // add to front to preserve order
        remainingBudget -= tokens;
      } else {
        break; // stop - remaining messages will not fit either
      }
    }

    const evictedCount = olderMessages.length - selected.length;
    const finalMessages = [...selected, ...recentMessages];
    const totalTokens = finalMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m.role, m.content),
      systemTokens
    );

    return {
      messages: finalMessages,
      totalTokens,
      evictedCount,
      evictionStrategy: evictedCount > 0 ? 'fifo' : 'none',
    };
  }

  /**
   * Returns stats about current context state.
   * Used by DevInfoPanel on Day 10.
   */
  getStats(): {
    totalMessages: number;
    estimatedTokens: number;
    isNearLimit: boolean;
  } {
    const totalMessages = this.messages.length;
    const estimatedTokens = this.messages.reduce(
      (sum, m) => sum + estimateMessageTokens(m.role, m.content),
      0
    );

    return {
      totalMessages,
      estimatedTokens,
      isNearLimit: estimatedTokens > this.TOKEN_BUDGET * 0.8,
    };
  }
}
