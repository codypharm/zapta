/**
 * Next.js Middleware
 * Runs on Edge Runtime for optimal performance
 * Auth is handled in Server Components (layouts/pages) instead
 */

import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Middleware runs on Edge for maximum performance
  // Auth checking is handled in Server Components where Supabase is fully supported
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
