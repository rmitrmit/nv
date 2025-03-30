// middleware.ts (placed either at the project root or inside src/)
import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const approvedDomain = 'nicevois.com'; // Your host domain

  if (url.hostname !== approvedDomain) {
    return new Response(
      "Invalid Origin. If you are interested in learning how this Vercell app works, feel free to contact us at info@nicevois.com, we can give you supports",
      { status: 500 }
    );
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
