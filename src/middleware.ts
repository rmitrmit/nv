import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the full URL and hostname
  const url = request.nextUrl;
  const hostname = url.hostname;
  const path = url.pathname;
  
  // Your primary domain
  const primaryDomain = 'nicevois.com';
  const wwwDomain = `www.${primaryDomain}`;
  
  // Very detailed logging
  console.log(`
    ==== MIDDLEWARE DEBUG ====
    Full URL: ${url.toString()}
    Hostname: ${hostname}
    Path: ${path}
    Headers Host: ${request.headers.get('host')}
    ==========================
  `);
  
  // Check if the hostname contains your primary domain
  const isAllowedDomain = hostname === primaryDomain || 
                          hostname === wwwDomain || 
                          hostname.endsWith(`.${primaryDomain}`);
  
  // Log the domain check result
  console.log(`Domain check: ${hostname} -> Allowed: ${isAllowedDomain}`);
  
  // Block access if not on an allowed domain
  if (!isAllowedDomain) {
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
          <p>Please visit <a href="https://${primaryDomain}">nicevois.com</a> to access the website.</p>
          <p><small>Debug info: Requested hostname: ${hostname}</small></p>
        </body>
      </html>
    `;
    
    console.log(`Blocking access to ${hostname} - Not an allowed domain`);
    
    return new Response(htmlResponse, { 
      status: 403,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    });
  }
  
  // Allow the request to proceed
  console.log(`Access allowed to ${hostname} - Proceeding to application`);
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};