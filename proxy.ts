import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)

const PROTECTED_PREFIXES = [
  "/upload",
  "/review",
  "/history",
  "/action-items",
  "/deadlines",
  "/dashboard",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (pathname === "/" && req.auth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
