# Architecture Decision Log
# VoidChats — Project North Star P1

---

## Why WebLLM over a server API

Server APIs charge per token, have network latency, send user data to
third parties, and go down under load. WebLLM runs inference on the
client's GPU via WebGPU — zero marginal cost, zero network latency
after first load, complete privacy. The model weights download once
to browser Cache Storage and are served locally on every subsequent visit.

Tradeoff: first load is 400MB–2GB depending on model tier. Mitigated
by the progress bar and the fact it only happens once.

---

## Why Qwen 2.5 3B as the high-tier model

Confirmed working in WebLLM 0.2.82 via prebuiltAppConfig.
Good quality/size tradeoff for Intel iGPU hardware.
4-bit quantization reduces memory footprint by ~4x vs fp16
while maintaining acceptable quality for chat tasks.

---

## Why semantic eviction over FIFO

FIFO drops the oldest messages when the context window fills.
This loses critical early context — the user's name, stated goals,
background information they mentioned once and never repeated.

Semantic eviction uses cosine similarity between the current query
embedding and each older message embedding. It keeps the most relevant
messages regardless of when they were sent, and evicts the least relevant.

Tradeoff: +100ms latency on first eviction (MiniLM download ~25MB),
<5ms per turn after first load. Worth it for quality improvement on
long conversations.

Implementation: all-MiniLM-L6-v2 via @xenova/transformers, lazy loaded
via dynamic import to avoid 40MB bundle penalty. Embeddings cached on
Message objects — computed once per message per session.

---

## Why AES-GCM over AES-CBC

AES-GCM is authenticated encryption — it detects tampering.
Any modification to the ciphertext causes decryption to fail loudly.
AES-CBC is unauthenticated — an attacker can modify ciphertext and
decryption succeeds, returning garbage silently.
Always prefer authenticated encryption for stored data.

---

## Why Web Crypto API over CryptoJS

Web Crypto is browser-native: zero bundle cost, maintained by browser
vendors, hardware-accelerated where available, subject to security audits.
CryptoJS adds bundle size, has had published CVEs, and is not
hardware-accelerated.

---

## Why PWA over React Native

No prior mobile development experience. A PWA delivers native-like
installation and offline behaviour from a single web codebase with
no app store submission, no platform-specific code, and no review process.

---

## Why IndexedDB over localStorage

localStorage is limited to ~5MB and stores only strings.
IndexedDB supports hundreds of MB, stores structured objects natively,
has transactional semantics, and supports indexes for efficient queries.
Used idb library for Promise-based API over the verbose native callbacks.

---

## Why useRef for ContextManager, not useState

ContextManager accumulates messages across renders. If it were in useState,
every addMessage() call would trigger a re-render of the entire chat UI.
useRef survives re-renders without triggering them — the manager is stable
for the component lifetime.

---

## Why not Turbopack

WebLLM's build pipeline has known incompatibilities with Turbopack
in Next.js 16. Using next dev --webpack until Turbopack stabilises.
Tracked: will re-evaluate on Day 17 performance audit.

---

## Why prebuiltAppConfig over manual model URLs

Manual model_lib URL construction causes 404s as the MLC CDN path
changes between WebLLM versions (v0_2_80 vs v0_2_82 etc).
Using prebuiltAppConfig lets WebLLM resolve the correct URL internally.
Lesson learned the hard way — two 404 errors during Day 1 setup.

---

## Why device-adaptive model selection

Intel Iris Xe iGPU has shared VRAM from system RAM.
Running a 7B model on 4GB RAM causes OOM crashes.
Three tiers: SmolLM2-360M (low, <4GB), Llama-1B (mid, 4-7GB),
Qwen-3B (high, 8GB+). Selection reason surfaced to user in loading screen.

## Why anonymous auth for Supabase sync

Requiring email/password creates friction and a privacy concern.
Anonymous auth gives each device a persistent user ID without
collecting any personal information. Conversations are tied to this
anonymous ID via row-level security.

Tradeoff: if the user clears browser storage, their anonymous session
is lost and they cannot access previous synced data without re-encryption.
Acceptable for a privacy-first app.

## Why encrypt-then-upload (not upload-then-encrypt)

The server must never see plaintext. Encrypting before upload means
even if Supabase is compromised, the attacker only gets encrypted blobs.
The passphrase never leaves the device. This is the correct model for
client-side encryption.

