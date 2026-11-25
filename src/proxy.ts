import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "iscp_session";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = url.pathname + url.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/principal",
    "/principal/:path*",
    "/teacher",
    "/teacher/:path*",
    "/student",
    "/student/:path*",
    "/parent",
    "/parent/:path*",
    "/dashboard",
    "/check-in",
    "/notifications",
    "/announcements",
    "/announcements/:path*",
    "/tuition",
    "/tuition/:path*",
    "/directory",
    "/directory/:path*",
    "/courses",
    "/branding",
    "/audit",
    "/calendar",
    "/schedule",
    "/help",
    "/cashier",
    "/cashier/:path*",
  ],
};
