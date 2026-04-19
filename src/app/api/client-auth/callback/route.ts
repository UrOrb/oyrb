import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, signSessionToken, CLIENT_SESSION_COOKIE } from "@/lib/client-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/client-login?error=missing", request.url));
  }

  const email = await verifyMagicToken(token);
  if (!email) {
    return NextResponse.redirect(new URL("/client-login?error=expired", request.url));
  }

  const session = await signSessionToken(email);

  const res = NextResponse.redirect(new URL("/my-bookings", request.url));
  res.cookies.set(CLIENT_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
