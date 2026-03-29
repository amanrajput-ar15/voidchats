// app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for sync operations.
 * Currently a passthrough — Supabase client handles auth directly.
 * This route exists for future server-side sync logic (rate limiting, metrics, etc).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Basic validation schema
    if (!body.conversationId) {
      return NextResponse.json(
        { error: 'conversationId required' },
        { status: 400 }
      );
    }
    
    // In the future, server-to-server Supabase calls or rate limiting logic goes here.
    return NextResponse.json({ ok: true });
    
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'VoidChats sync API operational' });
}