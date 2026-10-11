import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const pathname = req.nextUrl.pathname;

    if (pathname === "/dashboard/tiro" || pathname.startsWith("/dashboard/tiro/")) return NextResponse.redirect(new URL("/dashboard/sources", req.url));
    if (pathname === "/dashboard/admin-mcp" || pathname.startsWith("/dashboard/admin-mcp/")) return NextResponse.redirect(new URL("/dashboard/mcp", req.url));

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // /dashboard 경로는 인증이 필요
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        // 다른 경로는 허용
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
