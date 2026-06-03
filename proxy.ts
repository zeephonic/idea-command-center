import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/_next/", "/favicon.ico", "/api/cron/", "/api/auth/", "/api/init"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const auth = request.cookies.get("auth")?.value;
  if (auth === process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
