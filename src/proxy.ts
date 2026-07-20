import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DESIGN_SYSTEM_COOKIE_NAME,
  getDesignSystemPassword,
  verifyDesignSystemAccessToken,
} from "@/lib/design-system/access";

/**
 * Defense-in-depth for /design-system:
 * - Production without DESIGN_SYSTEM_PASSWORD → 404 (route appears absent)
 * - Invalid access cookie → cleared so the page shows the unlock form
 * Unlock API at /api/design-system/unlock is intentionally outside this matcher.
 */
export function proxy(request: NextRequest) {
  const password = getDesignSystemPassword();

  if (!password && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.next();
  const token = request.cookies.get(DESIGN_SYSTEM_COOKIE_NAME)?.value;

  if (token && password && !verifyDesignSystemAccessToken(token, password)) {
    response.cookies.set({
      name: DESIGN_SYSTEM_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/design-system",
      maxAge: 0,
    });
  }

  return response;
}

export const config = {
  matcher: ["/design-system", "/design-system/:path*"],
};
