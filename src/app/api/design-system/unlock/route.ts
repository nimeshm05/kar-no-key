import { NextResponse } from "next/server";
import {
  createDesignSystemAccessToken,
  DESIGN_SYSTEM_COOKIE_NAME,
  getDesignSystemCookieOptions,
  getDesignSystemPassword,
  passwordsMatch,
} from "@/lib/design-system/access";

type UnlockBody = {
  password?: unknown;
};

export async function POST(request: Request) {
  const password = getDesignSystemPassword();

  if (!password) {
    return NextResponse.json(
      { error: "Design system access is not configured." },
      { status: 503 },
    );
  }

  let body: UnlockBody;

  try {
    body = (await request.json()) as UnlockBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const provided =
    typeof body.password === "string" ? body.password : "";

  if (!passwordsMatch(provided, password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const isSecure = process.env.NODE_ENV === "production";

  response.cookies.set(
    DESIGN_SYSTEM_COOKIE_NAME,
    createDesignSystemAccessToken(password),
    getDesignSystemCookieOptions(isSecure),
  );

  return response;
}
