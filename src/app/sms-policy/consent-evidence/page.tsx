import Image from "next/image";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "SMS Consent Evidence — OYRB",
  description:
    "Compliance evidence for SMS toll-free verification. A reference page documenting OYRB's TCPA-compliant SMS consent flow.",
  // noindex on this evidence page only — keeps it out of search
  // results while still letting Twilio reviewers and crawlers fetch it
  // directly. The main /sms-policy page stays indexable.
  robots: { index: false, follow: true },
};

const PAGE_ASSEMBLED = "July 14, 2026";

export default function SmsConsentEvidencePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-sm text-[#B8896B]">Compliance reference</p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
          How clients consent to SMS reminders
        </h1>
        <p className="mt-2 text-sm text-[#737373]">
          Compliance evidence for SMS toll-free verification
        </p>

        <div className="mt-10 space-y-8 text-[#2a2a2a]">
          <section className="space-y-3">
            <p>
              This page documents OYRB&apos;s TCPA-compliant SMS consent flow as it appears on every booking widget across the platform. It is provided as a public reference for messaging carriers reviewing OYRB&apos;s toll-free verification status.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">The consent moment</h2>
            <p>
              When a client books a service through any OYRB beauty professional&apos;s storefront, they reach a confirmation step where they review their booking details and check optional consent boxes. The SMS consent box is optional, unchecked by default, and <strong>not required to complete the booking</strong> — a client can book and use the service fully without checking it. Clients who do not check the SMS consent box never receive any SMS messages — only those who explicitly opt in receive any text messages.
            </p>
            <p>
              The consent checkbox on the live booking widget reads: <em>&quot;Optional: I consent to receive automated SMS appointment reminders from [Business Name] at [phone number]. Message frequency varies. Message and data rates may apply. Consent is not a condition of any purchase. Reply STOP to unsubscribe, HELP for help. View our SMS Policy.&quot;</em>
            </p>
            <p>
              The screenshot below shows OYRB&apos;s booking confirmation step, captured from a live storefront. The consent checkbox wording has since been refined to the exact language quoted above; the placement, optional labeling, and unchecked-by-default behavior are unchanged.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Screenshot: the booking confirmation step</h2>
            <figure className="mt-4 overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
              <Image
                src="/sms-consent-evidence.png"
                alt="OYRB booking widget confirmation step. The page shows booking details, required consents (age confirmation, terms, authorization), and at the bottom an optional SMS consent checkbox. The SMS line reads: 'Optional: I agree to receive SMS appointment reminders at [phone number]. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe. View our SMS Policy.' The checkbox is unchecked by default."
                width={2000}
                height={1189}
                priority
                className="h-auto w-full"
                sizes="(max-width: 768px) 100vw, 720px"
              />
              <figcaption className="border-t border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-xs text-[#525252]">
                OYRB&apos;s booking confirmation step. The SMS consent checkbox sits at the bottom of the page, marked <strong>Optional</strong> and unchecked by default. The full TCPA-required disclosure language is displayed beside the checkbox, including message frequency, data rate disclosure, opt-out instructions, and a link to the full SMS Policy.
              </figcaption>
            </figure>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">What the screenshot demonstrates</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Express opt-in consent.</strong> The checkbox must be actively clicked. There is no pre-check, no inferred consent, no bundled consent.
              </li>
              <li>
                <strong>Required disclosure language.</strong> Message frequency varies. Message and data rates may apply. Consent is not a condition of any purchase. Reply STOP to unsubscribe, HELP for help.
              </li>
              <li>
                <strong>Not a condition of service.</strong> Booking completes identically whether or not the box is checked — SMS consent is never required to use the service.
              </li>
              <li>
                <strong>Linked policy.</strong> A direct, clickable link to OYRB&apos;s full <a href="/sms-policy" className="text-[#B8896B] hover:underline">SMS Policy</a> sits alongside the disclosure.
              </li>
              <li>
                <strong>Granular consent.</strong> Clients can confirm their booking and decline SMS independently. SMS consent is never bundled with required terms or other consents — it is presented as its own optional row, separated from the binding-agreement consents above.
              </li>
              <li>
                <strong>Phone number transparency.</strong> The SMS consent line displays the exact phone number consent attaches to.
              </li>
              <li>
                <strong>Server-side audit.</strong> Consent capture is logged with timestamp and IP address for verification.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Consent revocation</h2>
            <p>
              Clients can revoke SMS consent at any time. The fastest method is to reply STOP to any message received — STOP responses are honored immediately, with a single confirmation message sent before all future SMS messages are halted. Clients can also visit their booking confirmation page (linked in their original confirmation email or SMS) to access SMS preferences and toggle consent off at any time. All consent state changes are logged.
            </p>
          </section>

          <section className="space-y-1 border-t border-[#E7E5E4] pt-6 text-sm text-[#737373]">
            <p className="space-x-3">
              <a href="/sms-policy" className="text-[#B8896B] hover:underline">SMS Policy</a>
              <span>·</span>
              <a href="/privacy" className="text-[#B8896B] hover:underline">Privacy Policy</a>
              <span>·</span>
              <a href="/terms" className="text-[#B8896B] hover:underline">Terms of Service</a>
            </p>
            <p className="mt-2">Page assembled: {PAGE_ASSEMBLED}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
