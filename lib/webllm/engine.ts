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
    this._status = ModelStatus.INFERRING;
    this.resetIdleTimer();

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
      this._status = ModelStatus.READY;
    }
  }

  async unload(): Promise<void> {
    if (!this.engine) return;
    this._status = ModelStatus.UNLOADING;
    await this.engine.unload();
    this.engine = null;
    this._status = ModelStatus.UNLOADED;
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.unload(), this.IDLE_TIMEOUT_MS);
  }
}

export const webLLMEngine = new WebLLMEngine();