import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-auth";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/client-login", request.url), 302);
  res.cookies.set(CLIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
