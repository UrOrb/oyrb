import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-6 pt-28 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-medium tracking-[-0.02em]">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#B8896B] hover:underline">
              Get started
            </Link>
          </p>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
