// Lightweight email-based magic-link auth for booking clients.
// Signed JWTs — no separate DB table needed.
import { SignJWT, jwtVerify } from "jose";

const SECRET = process.env.CLIENT_AUTH_SECRET ?? process.env.CRON_SECRET ?? "";
const encoder = new TextEncoder();

// 20-minute magic link, 7-day session
const MAGIC_EXP = "20m";
const SESSION_EXP = "7d";

type MagicPayload = { email: string; kind: "magic" };
type SessionPayload = { email: string; kind: "session" };

function key() {
  if (!SECRET || SECRET.length < 16) {
    throw new Error("CLIENT_AUTH_SECRET (or CRON_SECRET) must be set to at least 16 chars");
  }
  return encoder.encode(SECRET);
}

export async function signMagicToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase(), kind: "magic" } satisfies MagicPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(MAGIC_EXP)
    .sign(key());
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if ((payload as MagicPayload).kind !== "magic") return null;
    return ((payload as MagicPayload).email ?? "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function signSessionToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase(), kind: "session" } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXP)
    .sign(key());
}

export async function verifySessionToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if ((payload as SessionPayload).kind !== "session") return null;
    return ((payload as SessionPayload).email ?? "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export const CLIENT_SESSION_COOKIE = "oyrb_client_session";
