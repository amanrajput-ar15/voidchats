# VoidChats — Private AI Web App

> A 3-billion parameter language model running entirely in your browser.
> Zero API calls. Zero server cost. Complete privacy.

**[Live Demo](https://voidchatsai.vercel.app)** · **[GitHub](https://github.com/amanrajputar-15/voidchats)**

---

![VoidChats Demo](docs/demo.gif)

---

## What it does

VoidChats runs a quantized language model locally using WebGPU — the same
GPU acceleration technology used in desktop apps, now available in Chrome.
Your conversations never leave your device. There is no backend receiving
your messages.

---

## Architecture
```
Browser (PWA)
├── WebLLM (WebGPU inference)     ← runs Qwen 2.5 3B locally
├── Transformers.js (embeddings)  ← semantic context management
├── IndexedDB (encrypted storage) ← AES-GCM via Web Crypto API
└── next-pwa (service worker)     ← offline-first, installable

Optional Cloud (user opt-in)
├── Supabase                      ← encrypted blobs only, never plaintext
└── Langfuse                      ← inference observability
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 App Router | RSC + client component boundaries |
| Inference | WebLLM @mlc-ai/web-llm 0.2.82 | Only WebGPU-based in-browser LLM engine |
| Model | Qwen2.5-3B-Instruct (4-bit quantized) | Best quality/size for integrated GPU |
| Embeddings | Transformers.js — all-MiniLM-L6-v2 | In-browser semantic similarity, 25MB |
| Storage | IndexedDB via idb | High-capacity structured browser storage |
| Encryption | Web Crypto API — AES-GCM + PBKDF2 | Browser-native, zero bundle cost |
| Sync | Supabase (optional, user opt-in) | Encrypted blobs only — server blind |
| PWA | next-pwa | Installable, offline-first |
| Observability | Langfuse (self-hosted) | Inference tracing, token metrics |
| Styling | Tailwind CSS | Utility-first, dark theme |
| Language | TypeScript strict | Type-safe AI state management |

---

## Design Decisions

### Why WebLLM over a server API
Server APIs cost per token, introduce network latency, and send user
data to third parties. WebLLM runs inference on the client GPU via
WebGPU — zero marginal cost, zero network latency after first load,
complete privacy. Model weights download once to Cache Storage and
are never re-downloaded.

### Why semantic eviction over FIFO
FIFO drops the oldest messages when the context window fills. This
loses critical early context — the user's stated goals, background
information, their name. Semantic eviction uses cosine similarity
of in-browser embeddings (all-MiniLM-L6-v2) to keep the most
relevant messages regardless of age.

**Tradeoff:** +100ms latency on first eviction (MiniLM download ~25MB),
<5ms per turn after. Worth it for significantly better long-conversation quality.

### Why AES-GCM over AES-CBC
AES-GCM is authenticated encryption — any modification to the ciphertext
causes decryption to fail loudly. AES-CBC is unauthenticated — an attacker
can modify ciphertext and decryption succeeds with garbage output.
Always prefer authenticated encryption for stored data.

### Why Web Crypto over CryptoJS
Browser-native: zero bundle cost, hardware-accelerated, maintained by
browser vendors, subject to security audits. CryptoJS adds bundle weight
and has had published CVEs.

### Why PWA over React Native
Single codebase, no app store submission, no review process. PWA delivers
native-like installation and offline behaviour from a web codebase.

---

## Performance

Measured on Intel Iris Xe gen-12lp (integrated GPU), 8GB RAM:

| Metric | Value |
|--------|-------|
| Inference speed | ~2 tok/s |
| Time to first token | ~3000ms |
| Model load (cached) | ~3-5s |
| Cold download (Qwen 3B) | ~47s (1.9GB) |
| Semantic eviction overhead | ~100ms first use |

*Faster on dedicated GPU: NVIDIA RTX 3060 → ~20-50 tok/s*

---

## How to Run Locally

**Requirements:** Chrome 113+ (WebGPU required), Node.js 18+
```bash
git clone https://github.com/amanrajput-ar15/voidchats.git
cd voidchats
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome.

First load downloads ~1.9GB model weights (cached permanently after).

**Environment variables (optional):**
```bash
cp .env.local.example .env.local
# Add Supabase and Langfuse keys for cloud sync + observability
```

---

## Project Structure
```
lib/
├── webllm/engine.ts          WebLLM singleton with idle unload
├── context/ContextManager.ts FIFO + semantic eviction
├── context/semanticEviction  MiniLM embeddings + cosine similarity
├── storage/db.ts             IndexedDB schema + CRUD
├── storage/encryption.ts     AES-GCM + PBKDF2
└── storage/sync.ts           Encrypt-then-upload to Supabase

components/
├── loading/ModelLoader.tsx   Progress bar + device-adaptive loading
├── chat/ChatContainer.tsx    Orchestrates all chat state
└── ui/DevInfoPanel.tsx       Live inference metrics

hooks/
├── useDeviceCapability.ts    RAM + WebGPU detection + model selection
├── useContextManager.ts      Stable ref-based context manager bridge
└── useBattery.ts             Battery level + inference throttling
```

---

## What I Learned

- WebGPU on integrated Intel graphics actually works for 1-3B models
- Semantic eviction meaningfully improves long-conversation quality
- PBKDF2 100k iterations takes ~2s on first use — worth the UX tradeoff
- next-pwa must be disabled in development or hot reload breaks
- Browser extensions cause hydration mismatches — add suppressHydrationWarning

---

## Part of Project North Star

This is Project 1 of 5 in a series 

