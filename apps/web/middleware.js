import { NextResponse } from "next/server";

/**
 * Next.js Middleware for SmartSupply AI Demo Mode.
 * Bypasses authentication guards on /demo and flags the session
 * for zero-cost, isolated client-side execution.
 */
export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;

  // Automatic /demo or ?demo=true interceptor
  if (pathname === "/demo" || searchParams.get("demo") === "true") {
    const response = NextResponse.next();
    response.cookies.set("smartsupply_isDemo", "true", { path: "/" });
    response.headers.set("x-smartsupply-demo", "true");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/demo", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
