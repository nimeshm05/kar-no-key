import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

const crypto = webcrypto;

function toBase64Url(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return Buffer.from(binary, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  return new Uint8Array(Buffer.from(base64, "base64"));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function mint(secret, playerId, lobbyId, nowSec) {
  const payload = {
    pid: playerId,
    lid: lobbyId,
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const payloadPart = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadPart),
  );
  return `${payloadPart}.${toBase64Url(signature)}`;
}

async function verify(secret, token, nowSec) {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const key = await importHmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signaturePart),
    new TextEncoder().encode(payloadPart),
  );
  if (!ok) {
    return null;
  }

  const payload = JSON.parse(
    new TextDecoder().decode(fromBase64Url(payloadPart)),
  );
  if (payload.exp < nowSec) {
    return null;
  }

  return { playerId: payload.pid, lobbyId: payload.lid };
}

test("player session tokens round-trip and reject tampering", async () => {
  const secret = "test-session-secret";
  const now = 1_700_000_000;
  const token = await mint(
    secret,
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    now,
  );

  const claims = await verify(secret, token, now);
  assert.equal(claims.playerId, "11111111-1111-4111-8111-111111111111");
  assert.equal(claims.lobbyId, "22222222-2222-4222-8222-222222222222");

  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(await verify(secret, tampered, now), null);
  assert.equal(await verify("wrong-secret", token, now), null);
  assert.equal(await verify(secret, token, now + 10_000), null);
});
