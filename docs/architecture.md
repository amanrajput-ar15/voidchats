# System Architecture: VoidChats

## High-Level Design (HLD)

VoidChats is a local-first, offline-capable AI application. It flips the traditional client-server LLM architecture by moving the entire inference and embedding pipeline to the edge (the user's browser) utilizing WebGPU.

### Core Subsystems

1.  **Application Shell & UI (Next.js App Router)**
    * Client-side rendered React components.
    * Strict isolation of state: UI components do not hold inference logic.
    * PWA Service Worker (`next-pwa`) handles aggressive caching of static assets to enable offline functionality.

2.  **Inference Engine (`@mlc-ai/web-llm`)**
    * Compiles TVM (Tensor Virtual Machine) models to WebGPU shaders.
    * Downloads quantized model weights directly from HuggingFace to browser `Cache API`.
    * Executes fully offline after the initial pull.

3.  **Semantic Memory Manager (`Transformers.js`)**
    * Maintains the active context window to respect the strict 1500-token budget.
    * When the budget is exceeded, it computes embeddings (MiniLM-L6-v2) for the current query and all historical messages.
    * Executes Cosine Similarity math to evict the mathematically least relevant messages, rather than defaulting to a naive FIFO drop.

4.  **Secure Storage Layer (IndexedDB + Web Crypto)**
    * Plaintext conversations exist only in volatile RAM.
    * Before writing to IndexedDB, payloads are encrypted via AES-GCM (256-bit).
    * Encryption keys are derived locally using PBKDF2 (100,000 iterations) from a user-provided passphrase.

5.  **Optional Cloud Infrastructure**
    * **Telemetry (Langfuse):** A fire-and-forget logging pipeline for non-sensitive inference metrics (tok/s, latency, eviction counts). Payload content is strictly `null` to preserve privacy.
    * **Sync (Supabase):** Receives fully encrypted blobs. The server holds zero decryption capability (Zero-Knowledge architecture).

---

## Data Flow: Message Lifecycle

1. **Input Capture:** User submits a prompt via UI.
2. **Context Assembly:** `ContextManager` pulls recent history. If token budget is near capacity, `SemanticEviction` is triggered to prune irrelevant context.
3. **Inference Execution:** Prompt + Optimized Context is passed to WebLLM.
4. **Streaming Response:** WebLLM yields tokens back to the UI state iteratively.
5. **Encryption Pipeline:** Upon completion, the full turn (User + Assistant message) is serialized, encrypted via AES-GCM, and written to IndexedDB.
6. **Observability Sync:** Metadata (timings, token counts) is POSTed asynchronously to Langfuse.
7. **Cloud Sync (If enabled):** The newly updated encrypted blob is synced to Supabase.