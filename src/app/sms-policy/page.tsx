import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "SMS Messaging Policy — OYRB",
  description: "What SMS messages OYRB sends, how you opted in, and how to opt out.",
};

const LAST_UPDATED = "April 28, 2026";
const CONTACT_EMAIL = "support@oyrb.space";

export default function SmsPolicyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-sm text-[#B8896B]">Legal</p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
          SMS Messaging Policy
        </h1>
        <p className="mt-2 text-sm text-[#737373]">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-8 text-[#2a2a2a]">
          <section className="space-y-3">
            <p>
              OYRB (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides SMS messaging services to clients of beauty professionals using the OYRB platform. This policy explains what messages you may receive, how you opted in, and how to opt out.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">What messages you&apos;ll receive</h2>
            <p>
              When you book an appointment with a beauty professional through OYRB, you may receive the following SMS messages:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Appointment confirmations</li>
              <li>Appointment reminders (24 hours and 2 hours before your appointment)</li>
              <li>Schedule changes (cancellations, reschedules, or pro updates)</li>
              <li>Post-appointment review requests</li>
              <li>Important account or booking updates</li>
            </ul>
            <p>
              SMS reminders are available on the Studio and Scale subscription plans. Clients of beauty professionals on the Starter plan will not receive SMS regardless of opt-in status.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">How you opted in</h2>
            <p>You consented to receive SMS messages by:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Providing your phone number when booking an appointment through any OYRB-powered booking site, AND</li>
              <li>
                Checking the consent checkbox during checkout that reads: &quot;I agree to receive SMS appointment reminders. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe.&quot;
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Message frequency</h2>
            <p>
              Message frequency varies based on your booking activity. You may receive 1-5 messages per appointment cycle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Message and data rates</h2>
            <p>
              Standard message and data rates may apply per your mobile carrier agreement. OYRB does not charge for SMS messages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">How to opt out</h2>
            <p>
              You may opt out of receiving SMS messages at any time by replying STOP to any message you receive. After replying STOP, you will receive a confirmation message and no further SMS messages from that beauty professional. To resume messages, reply START.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">How to get help</h2>
            <p>
              For SMS-related help, reply HELP to any message, or contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#B8896B] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Contact us</h2>
            <p>
              Questions about this policy? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#B8896B] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">For Beauty Professionals</h2>
            <p>
              The sections above describe what messages clients receive and how to opt out. The information below is for beauty professionals using OYRB to send those messages — please read it before manually entering a booking on a client&apos;s behalf or sharing your booking link.
            </p>
            <p>
              <strong>Manual bookings do not trigger SMS.</strong> When a beauty professional creates a booking on a client&apos;s behalf through the OYRB dashboard (manual booking entry), OYRB does not send any SMS messages to that client for that booking. Email reminders are still sent if an email address is on file. This applies regardless of subscription tier or any other configuration.
            </p>
            <p>
              <strong>Why this rule exists.</strong> The Telephone Consumer Protection Act (TCPA) prohibits sending SMS messages to recipients without documented prior express written consent. Violations expose both OYRB and the beauty professional to statutory penalties of $500 to $1,500 per message. OYRB&apos;s SMS sending privileges with our carrier are also at risk if uncontested complaints accumulate, which would interrupt SMS for every professional on the platform.
            </p>
            <p>
              <strong>Verbal consent is not sufficient.</strong> Documented opt-in — a checkbox the client themselves ticks, with timestamp and IP address captured server-side — is the only consent regime that satisfies TCPA. A beauty professional asserting that a client agreed verbally creates no documented record and is not a valid opt-in under federal law. OYRB captures documented consent only when the client checks the SMS consent box themselves during a booking on the public booking widget.
            </p>
            <p>
              <strong>If a client wants SMS reminders for future bookings,</strong> the beauty professional should share their public OYRB booking page (<code className="font-mono text-sm">{`oyrb.space/s/{their-slug}`}</code>). When the client books their next appointment through the public widget, they will see the SMS consent checkbox and can opt in themselves. Once consented, SMS reminders are sent normally for that and all subsequent bookings with that professional. There is currently no mechanism to add SMS consent to an existing manual booking — the client must complete a new booking through the public widget to opt in.
            </p>
            <p>
              <strong>No override mechanism exists.</strong> OYRB does not provide any interface, checkbox, or API for beauty professionals to mark SMS consent on behalf of clients. This is intentional and not configurable.
            </p>
          </section>

          <section className="space-y-1 pt-4 text-sm text-[#737373]">
            <p>OYRB</p>
            <p>
              <a href="https://oyrb.space" className="text-[#B8896B] hover:underline">oyrb.space</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
