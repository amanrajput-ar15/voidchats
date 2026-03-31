# Project Roadmap & Technical Debt

VoidChats is currently in `v1.0`. While the core functionality of edge-based inference and semantic memory is stable, the system architecture requires optimization for production-grade web performance. 

## Immediate Technical Debt (v1.1)
*Based on initial Lighthouse auditing and performance profiling.*

- [ ] **Web Worker Offloading:** Move `@mlc-ai/web-llm` and `Transformers.js` entirely off the main thread into Web Workers. Currently, inference and embedding generation cause severe main-thread blocking (~8.4s TBT), leading to UI freezing during semantic eviction.
- [ ] **Dynamic Chunking:** Break up the 6MB `main-app.js` payload. WebLLM should only be fetched when the user explicitly initiates a chat session, not on initial application load.
- [ ] **Streaming Decryption:** Implement chunked decryption for massive conversation histories so the UI doesn't hang when loading a chat with hundreds of turns.

## Medium-Term Features (v1.5)

- [ ] **Local RAG (Retrieval-Augmented Generation):** Allow users to drop PDFs or text files into the browser. Chunk, embed (via MiniLM), and store them in Vector-indexed IndexedDB to allow the model to chat with local documents.
- [ ] **Model Hot-Swapping:** Allow advanced users to specify custom HuggingFace model URLs (e.g., Llama-3-8B-Instruct-q4f32_1) if they have hardware exceeding 16GB VRAM.
- [ ] **Export/Import:** Standardized JSON export of raw encrypted blobs for manual backups without Supabase.

## Long-Term Vision (v2.0 - Project North Star)

VoidChats serves as the foundational edge-inference environment for the broader autonomous systems roadmap.

- [ ] **Tool Calling / Function Execution:** Expand the context manager to parse JSON outputs for local function calling (e.g., local file system access, fetching web URLs).
- [ ] **Agentic Loops:** Integrate reflection and self-correction flows directly in the browser environment.
- [ ] **Headless Mode:** Package the inference, context, and storage layers into an NPM package that can be consumed by the upcoming self-improving coding agent project.