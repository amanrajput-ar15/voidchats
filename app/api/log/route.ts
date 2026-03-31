// app/api/log/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface LogPayload {
  sessionId: string;
  modelId: string;
  tokensPerSecond: number | null;
  latencyMs: number | null;
  contextTokens: number;
  evictionStrategy: string;
  evictedCount: number;
  totalTokensGenerated: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: LogPayload = await req.json();
    
    // Only log if Langfuse is configured
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST;
    
    if (!publicKey || !secretKey || !host || publicKey === 'pk-lf-your-key') {
      // Langfuse not configured — silently skip
      return NextResponse.json({ ok: true, skipped: true });
    }
    
    const { Langfuse } = await import('langfuse');
    const langfuse = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    });
    
    const trace = langfuse.trace({
      id: body.sessionId,
      name: 'voidchats-inference',
      metadata: {
        modelId: body.modelId,
        deviceType: 'browser-webgpu',
      },
    });
    
    trace.generation({
      name: 'chat-completion',
      model: body.modelId,
      usage: {
        totalTokens: body.contextTokens,
      },
      metadata: {
        tokensPerSecond: body.tokensPerSecond,
        latencyMs: body.latencyMs,
        evictionStrategy: body.evictionStrategy,
        evictedCount: body.evictedCount,
        totalTokensGenerated: body.totalTokensGenerated,
        error: body.error ?? null,
      },
    });
    
    await langfuse.flushAsync();
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never let observability break the app
    console.error('[Langfuse] Log failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'VoidChats log API',
    langfuseConfigured: !!(
      process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY &&
      process.env.LANGFUSE_HOST &&
      process.env.LANGFUSE_PUBLIC_KEY !== 'pk-lf-your-key'
    ),
  });
}