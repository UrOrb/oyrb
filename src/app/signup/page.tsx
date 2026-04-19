import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/marketing/nav";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create your site",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-6 pt-28 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-medium tracking-[-0.02em]">
            Start your free trial.
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            14 days free. Card required, no charge until day 15.{" "}
            <Link href="/login" className="text-[#B8896B] hover:underline">
              Already have an account?
            </Link>
          </p>
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
          <p className="mt-6 text-center text-xs text-[#A3A3A3]">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline hover:text-[#525252]">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-[#525252]">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
