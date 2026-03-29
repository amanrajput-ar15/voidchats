// lib/context/ContextManager.ts
import { Message, ContextWindow } from '@/lib/types';
import { estimateMessageTokens } from './tokenCounter';
import { rankByRelevance } from './semanticEviction';

export const CONTEXT_TOKEN_BUDGET = 1500;

export class ContextManager {
  private messages: Message[] = [];

  private readonly TOKEN_BUDGET = CONTEXT_TOKEN_BUDGET;

  // Always keep last N exchanges regardless of relevance score
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
   * FIFO eviction — fills budget from newest to oldest.
   * Used as fallback when semantic eviction fails.
   * Also used on short conversations where eviction hasn't kicked in yet.
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

    const anchorCount = this.RECENCY_ANCHOR * 2;
    const recentMessages = this.messages.slice(-anchorCount);
    const olderMessages = this.messages.slice(0, -anchorCount);

    const recentTokens = recentMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m.role, m.content),
      0
    );

    // Edge case: recent messages alone exceed budget
    if (recentTokens >= budget) {
      return {
        messages: recentMessages.slice(-2),
        totalTokens: recentMessages
          .slice(-2)
          .reduce(
            (sum, m) => sum + estimateMessageTokens(m.role, m.content),
            systemTokens
          ),
        evictedCount: this.messages.length - 2,
        evictionStrategy: 'fifo',
      };
    }

    let remainingBudget = budget - recentTokens;
    const selected: Message[] = [];

    // Fill from most recent older message backwards
    for (let i = olderMessages.length - 1; i >= 0; i--) {
      const msg = olderMessages[i];
      const tokens = estimateMessageTokens(msg.role, msg.content);
      if (tokens <= remainingBudget) {
        selected.unshift(msg);
        remainingBudget -= tokens;
      } else {
        break;
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
   * SEMANTIC eviction — smarter than FIFO.
   *
   * Algorithm:
   * 1. Always keep last RECENCY_ANCHOR exchanges (recency anchor)
   * 2. Rank older messages by cosine similarity to current query
   * 3. Greedily fill remaining token budget with most relevant messages
   * 4. Restore chronological order for the LLM
   *
   * Falls back to FIFO if embedding computation fails.
   */
  async buildContextSemantic(currentQuery: string): Promise<ContextWindow> {
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

    const anchorCount = this.RECENCY_ANCHOR * 2;
    const recentMessages = this.messages.slice(-anchorCount);
    const olderMessages = this.messages.slice(0, -anchorCount);

    const recentTokens = recentMessages.reduce(
      (sum, m) => sum + estimateMessageTokens(m.role, m.content),
      0
    );

    // Edge case: recent messages alone exceed budget
    if (recentTokens >= budget) {
      return {
        messages: recentMessages.slice(-2),
        totalTokens: recentMessages
          .slice(-2)
          .reduce(
            (sum, m) => sum + estimateMessageTokens(m.role, m.content),
            systemTokens
          ),
        evictedCount: this.messages.length - 2,
        evictionStrategy: 'semantic',
      };
    }

    // No older messages to rank — return recent only
    if (olderMessages.length === 0) {
      return {
        messages: recentMessages,
        totalTokens: recentTokens + systemTokens,
        evictedCount: 0,
        evictionStrategy: 'none',
      };
    }

    const remainingBudget = budget - recentTokens;
    let ranked: Array<{ message: Message; score: number }>;

    try {
      // Rank older messages by semantic relevance to current query
      ranked = await rankByRelevance(olderMessages, currentQuery);
    } catch (err) {
      // Embedding failed — fall back to FIFO silently
      console.warn(
        '[ContextManager] Semantic ranking failed, falling back to FIFO:',
        err
      );
      return this.buildContext();
    }

    // Greedily fill budget with most relevant messages
    const selected: Message[] = [];
    let usedTokens = 0;

    for (const { message } of ranked) {
      const tokens = estimateMessageTokens(message.role, message.content);
      if (usedTokens + tokens <= remainingBudget) {
        selected.push(message);
        usedTokens += tokens;
      }
      // Don't break — a later smaller message might still fit
    }

    // Restore chronological order — LLM needs time-ordered context
    selected.sort((a, b) => a.timestamp - b.timestamp);

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
      evictionStrategy: evictedCount > 0 ? 'semantic' : 'none',
    };
  }

  /**
   * Returns stats about current context state.
   * Used by DevInfoPanel (Day 10) and ChatInput footer.
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