// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  // Pass the request forward. 
  // We use _request to tell the linter we are intentionally ignoring the unused variable.
  return NextResponse.next();
}

export const config = {
  matcher: '/api/sync/:path*',
};