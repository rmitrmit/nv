import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the hostname from the request URL
  const hostname = request.nextUrl.hostname;
  
  // List of allowed domains
  const allowedDomains = ['nicevois.com', 'www.nicevois.com'];
  
  // For debugging - you can check logs in Vercel
  console.log('Middleware running, hostname:', hostname);
  
  // Check if the hostname is in the allowed list
  if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return new Response(
      "Invalid Origin. If you are interested in learning how this Vercel app works, feel free to contact us at info@nicevois.com, we can provide support.",
      { 
        status: 403,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
  }
  
  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  // This matcher applies the middleware to all routes except static assets and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};