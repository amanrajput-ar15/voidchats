// lib/webllm/engine.ts
import * as webllm from '@mlc-ai/web-llm';
import { ModelStatus } from '@/lib/types';

class WebLLMEngine {
  private engine: webllm.MLCEngine | null = null;
  private _status: ModelStatus = ModelStatus.UNLOADED;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  get status(): ModelStatus {
    return this._status;
  }

  async load(
    modelId: string,
    onProgress: (report: webllm.InitProgressReport) => void
  ): Promise<void> {
    if (this._status === ModelStatus.READY) return;
    if (this._status === ModelStatus.LOADING) return;
    this._status = ModelStatus.LOADING;

    try {
      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: onProgress,
      });
      this._status = ModelStatus.READY;
      this.resetIdleTimer();
    } catch (err) {
      this._status = ModelStatus.ERROR;
      throw err;
    }
  }

  async *streamCompletion(
    messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    if (!this.engine || this._status !== ModelStatus.READY) {
      throw new Error('Engine not ready. Load model first.');
    }

    // Cancel any pending idle unload — we are about to use the engine
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this._status = ModelStatus.INFERRING;

    try {
      const stream = await this.engine.chat.completions.create({
        messages: messages as webllm.ChatCompletionMessageParam[],
        stream: true,
        temperature: 0.7,
        max_tokens: 512,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) yield delta;
      }
    } finally {
      // Only set READY and restart timer after inference fully completes
      this._status = ModelStatus.READY;
      this.resetIdleTimer();
    }
  }

  async unload(): Promise<void> {
    if (!this.engine) return;

    // NEVER unload during inference — GPU buffers are in use
    if (this._status === ModelStatus.INFERRING) {
      console.warn('[WebLLMEngine] Unload requested during inference — skipping');
      return;
    }

    this._status = ModelStatus.UNLOADING;

    try {
      await this.engine.unload();
    } catch (err) {
      console.warn('[WebLLMEngine] Unload error (non-fatal):', err);
    } finally {
      this.engine = null;
      this._status = ModelStatus.UNLOADED;
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    this.idleTimer = setTimeout(async () => {
      // Double-check status before unloading
      if (this._status === ModelStatus.READY) {
        console.log('[WebLLMEngine] Idle timeout — unloading model');
        await this.unload();
      }
      // If INFERRING, do nothing — streamCompletion finally block
      // will call resetIdleTimer() when done
    }, this.IDLE_TIMEOUT_MS);
  }
}

export const webLLMEngine = new WebLLMEngine();