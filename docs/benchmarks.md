# VoidChats — Performance Benchmarks

**Machine:** Custom Windows PC / Laptop  
**GPU:** Intel Iris Xe gen-12lp (integrated)  
**RAM:** 8GB  
**Date:** March 2026  
**Model:** Qwen2.5-3B-Instruct-q4f32_1-MLC  

---

## Inference Speed

| Metric | Value |
|--------|-------|
| Average tokens/sec | ~2 tok/s |
| Min tokens/sec | ~0 tok/s |
| Max tokens/sec | ~3 tok/s |
| Time to first token (avg) | ~3000ms |

*Measured via DevInfo panel across 20 turns*

---

## Loading

| Metric | Value |
|--------|-------|
| Cold start (first download) | ~47s (1.9GB Qwen 3B) |
| Warm load (from cache) | ~3-5s |
| MiniLM first load | ~5-10s |
| MiniLM cached load | <1s |

---

## Bundle Size

Run `npm run build` and check output:

| Asset | Size |
|-------|------|
| main-app.js | ~6MB |
| Total JS | ~6MB |

*Large due to @xenova/transformers — lazy loaded so initial load is fast*

---

## Context Window

| Metric | Value |
|--------|-------|
| Token budget | 1500 tokens |
| Avg conversation before eviction | ~8-10 messages |
| Semantic eviction overhead | ~100ms first time |
| Semantic eviction cached | <5ms |

---

## Lighthouse (Local Dev Run)

**URL:** http://localhost:3000/chat  
**Environment:** Chrome DevTools (Lighthouse 13)  
**Device Emulation:** Moto G Power  
**Network:** Slow 4G throttling  

### Scores

| Category | Score |
|----------|-------|
| Performance | **45** |
| Accessibility | **84** |
| Best Practices | **100** |
| SEO | **91** |

---

### Core Web Vitals & Metrics

| Metric | Value |
|--------|-------|
| First Contentful Paint (FCP) | 1.2 s |
| Largest Contentful Paint (LCP) | 13.6 s |
| Speed Index | 1.8 s |
| Total Blocking Time (TBT) | 5,110 ms |
| Cumulative Layout Shift (CLS) | 0 |

---

### Key Performance Issues

- Heavy **main-thread blocking (~8.4s)**
- High **JavaScript execution time (~5.8s)**
- Large **unused JavaScript (~1.4MB)**
- **Huge network payload (~53MB total)**
- Multiple **long tasks (15 detected)**
- Render-blocking resources present

---

### Opportunities

- Reduce unused JavaScript (~1.4MB savings)
- Minify JS (~53KB savings)
- Reduce render-blocking requests (~150ms savings)
- Optimize network dependency tree

---

### Diagnostics

- Minimize main-thread work (~8.4s)
- Reduce JS execution time (~5.8s)
- Avoid large payloads (~53MB total)
- Avoid long tasks (15 found)
- Improve animation compositing

---

## Accessibility Issues

- Missing `alt` attributes on images
- Poor color contrast
- Missing semantic landmarks (`<main>`)

---

## Notes

- Intel Iris Xe iGPU is significantly slower than dedicated GPU
- On NVIDIA RTX 3060: expect 20-50 tok/s
- On Apple M2: expect 15-30 tok/s
- WebGPU overhead on first inference: shader compilation ~1-2s

---

## System Observations (Engineering Perspective)

- Performance bottleneck is **CPU-bound (main thread)**, not GPU
- Rendering pipeline is **blocking instead of streaming**
- Large payload suggests **inefficient data transfer (chat history / assets)**
- UI likely re-renders excessively → poor scalability

---