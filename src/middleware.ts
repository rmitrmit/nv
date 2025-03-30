import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the hostname from the request URL
  const hostname = request.nextUrl.hostname;
  
  // Your primary domain
  const primaryDomain = 'nicevois.com';
  const wwwDomain = `www.${primaryDomain}`;
  
  // Debug log
  console.log(`Middleware running | Hostname: ${hostname} | Path: ${request.nextUrl.pathname}`);
  
  // Block access if not on the primary domain
  if (hostname !== primaryDomain && hostname !== wwwDomain) {
    // Create a proper HTML response
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Denied</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: sans-serif; 
              text-align: center; 
              padding: 50px; 
              line-height: 1.6;
            }
            h1 { color: #e53e3e; }
            p { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Invalid Origin</h1>
          <p>If you are interested in learning how this Vercel app works, feel free to contact us at info@nicevois.com, we can give you support.</p>
          <p>Please visit <a href="https://nicevois.com">nicevois.com</a> to access the website.</p>
        </body>
      </html>
    `;
    
    // Log the blocked request
    console.log(`Blocking access | Hostname: ${hostname} | Returning 403`);
    
    return new Response(htmlResponse, { 
      status: 403,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    });
  }
  
  // Allow the request to proceed if on the primary domain
  console.log(`Access allowed | Hostname: ${hostname} | Proceeding to app`);
  return NextResponse.next();
}

export const config = {
  // Apply to all routes except assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};