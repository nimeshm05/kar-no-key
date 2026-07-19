const SESSION_TTL_SEC = 60 * 60 * 24; // 24 hours
const SECRET_ENV = "PLAYER_SESSION_SECRET";

export type PlayerSessionClaims = {
  playerId: string;
  lobbyId: string;
  iat: number;
  exp: number;
};

type SessionPayload = {
  pid: string;
  lid: string;
  iat: number;
  exp: number;
};

function getSessionSecret(): string {
  const secret = Deno.env.get(SECRET_ENV)?.trim();
  if (!secret) {
    throw new Error(`${SECRET_ENV} is not configured`);
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(secret: string, payloadPart: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadPart),
  );
  return toBase64Url(signature);
}

async function verifySignature(
  secret: string,
  payloadPart: string,
  signaturePart: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const signatureBytes = fromBase64Url(signaturePart);
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(payloadPart),
  );
}

export async function mintPlayerSessionToken(
  playerId: string,
  lobbyId: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<string> {
  const secret = getSessionSecret();
  const payload: SessionPayload = {
    pid: playerId,
    lid: lobbyId,
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SEC,
  };
  const payloadPart = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signaturePart = await signPayload(secret, payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export async function verifyPlayerSessionToken(
  token: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<PlayerSessionClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadPart, signaturePart] = parts;
  if (!payloadPart || !signaturePart) {
    return null;
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const validSignature = await verifySignature(secret, payloadPart, signaturePart);
  if (!validSignature) {
    return null;
  }

  let payload: SessionPayload;
  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadPart));
    payload = JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.pid !== "string" ||
    typeof payload.lid !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (payload.exp < nowSec) {
    return null;
  }

  return {
    playerId: payload.pid,
    lobbyId: payload.lid,
    iat: payload.iat,
    exp: payload.exp,
  };
}

export function readSessionToken(body: {
  session_token?: unknown;
}): string | null {
  if (typeof body.session_token !== "string") {
    return null;
  }

  const token = body.session_token.trim();
  return token.length > 0 ? token : null;
}
