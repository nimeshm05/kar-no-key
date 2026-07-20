import { createHmac, timingSafeEqual } from "crypto";

export const DESIGN_SYSTEM_COOKIE_NAME = "design_system_access";
export const DESIGN_SYSTEM_COOKIE_PATH = "/design-system";
export const DESIGN_SYSTEM_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

const TOKEN_PAYLOAD = "design-system-access";

export function getDesignSystemPassword(): string | null {
  const password = process.env.DESIGN_SYSTEM_PASSWORD?.trim();
  return password ? password : null;
}

export function createDesignSystemAccessToken(password: string): string {
  const signature = createHmac("sha256", password)
    .update(TOKEN_PAYLOAD)
    .digest("hex");
  return `v1.${signature}`;
}

export function verifyDesignSystemAccessToken(
  token: string | undefined,
  password: string,
): boolean {
  if (!token) {
    return false;
  }

  const expected = createDesignSystemAccessToken(password);
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function getDesignSystemCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true as const,
    secure: isSecure,
    sameSite: "lax" as const,
    path: DESIGN_SYSTEM_COOKIE_PATH,
    maxAge: DESIGN_SYSTEM_COOKIE_MAX_AGE_SEC,
  };
}
