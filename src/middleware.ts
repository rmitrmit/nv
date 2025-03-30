// middleware.ts
import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const allowedDomains = ['nicevois.com', 'www.nicevois.com'];

  console.log('Middleware running, hostname:', hostname); // Check this in Vercel logs

  if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return new Response(
      "Invalid Origin. If you are interested in learning how this Vercell app works, feel free to contact us at info@nicevois.com, we can provide support.",
      { 
        status: 403,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
  
  return NextResponse.next();
}

// For debugging, use a matcher that applies to all routes:
export const config = {
  matcher: '/:path*',
};
