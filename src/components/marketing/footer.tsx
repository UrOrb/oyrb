import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E7E5E4] bg-[#FAFAF9]">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="font-display text-lg font-medium">
              OYRB
            </Link>
            <p className="mt-3 text-sm text-[#737373]">
              A booking and website platform built for beauty professionals.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <span className="font-medium text-[#0A0A0A]">Product</span>
              <Link href="/features" className="text-[#737373] hover:text-[#0A0A0A] transition-colors">Features</Link>
              <Link href="/pricing" className="text-[#737373] hover:text-[#0A0A0A] transition-colors">Pricing</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-medium text-[#0A0A0A]">Account</span>
              <Link href="/login" className="text-[#737373] hover:text-[#0A0A0A] transition-colors">Sign in</Link>
              <Link href="/signup" className="text-[#737373] hover:text-[#0A0A0A] transition-colors">Get started</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E7E5E4] pt-6 text-xs text-[#A3A3A3]">
          © {new Date().getFullYear()} OYRB. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
