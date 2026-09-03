// Lightweight email-based magic-link auth for booking clients.
// Signed JWTs — no separate DB table needed.
import { SignJWT, jwtVerify } from "jose";

// CLIENT_AUTH_SECRET is its own dedicated secret. It must NOT fall back to
// CRON_SECRET — those serve different security domains and sharing them
// means a compromise of one becomes a compromise of the other.
const SECRET = process.env.CLIENT_AUTH_SECRET ?? "";
const encoder = new TextEncoder();

// 20-minute magic link, 7-day session
const MAGIC_EXP = "20m";
const SESSION_EXP = "7d";

type MagicPayload = { email: string; kind: "magic" };
type SessionPayload = { email: string; kind: "session" };
type PhoneVerificationPayload = { phone: string; kind: "phone_verified" };

function key() {
  if (!SECRET || SECRET.length < 32) {
    throw new Error("CLIENT_AUTH_SECRET must be set to at least 32 chars");
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

export async function signPhoneVerificationToken(phone: string): Promise<string> {
  return new SignJWT({ phone, kind: "phone_verified" } satisfies PhoneVerificationPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(key());
}

export async function verifyPhoneVerificationToken(
  token: string | null | undefined,
  phone: string | null | undefined,
): Promise<boolean> {
  if (!token || !phone) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    const verified = payload as PhoneVerificationPayload;
    return verified.kind === "phone_verified" && verified.phone === phone;
  } catch {
    return false;
  }
}

export const CLIENT_SESSION_COOKIE = "oyrb_client_session";
