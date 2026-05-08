import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "SMS Messaging Policy — OYRB",
  description: "What SMS messages OYRB sends, how you opted in, and how to opt out.",
};

const EFFECTIVE_DATE = "May 8, 2026";
const LAST_UPDATED = "May 8, 2026";
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
          Effective: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-10 space-y-8 text-[#2a2a2a]">
          <section className="space-y-3">
            <p>
              OYRB (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides SMS messaging services to clients of beauty professionals using the OYRB platform. This policy explains what messages you may receive, how you opted in, and how to opt out.
            </p>
            <p>
              For information about how we collect, use, and protect phone numbers and SMS data, see our <a href="/privacy" className="text-[#B8896B] hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">What messages you&apos;ll receive</h2>
            <p>
              When you book an appointment with a beauty professional through OYRB, you may receive the following SMS messages:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Appointment confirmations</li>
              <li>Appointment reminders (24 hours before your appointment)</li>
              <li>Reschedule notifications when your beauty professional reschedules an appointment</li>
              <li>Waitlist availability alerts (only if you joined a waitlist for a fully-booked appointment time)</li>
            </ul>
            <p>
              SMS reminders are available on the Studio and Scale subscription plans. Clients of beauty professionals on the Starter plan will not receive SMS regardless of opt-in status.
            </p>
            <p>
              Phone verification codes sent during booking (when phone verification is enabled) are routed through a separate Twilio service intended for transactional verification. Those codes are sent only when you actively request a code and are not subject to this policy&apos;s marketing-style opt-in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Who sends these messages</h2>
            <p>
              SMS messages are sent on behalf of individual beauty professionals using the OYRB platform. Each beauty professional has consented to OYRB&apos;s terms governing message content and frequency. Messages are dispatched through OYRB&apos;s SMS infrastructure (powered by Twilio) and identify the beauty professional sending the message. To contact a beauty professional directly, reply to the message or use the contact information provided in your appointment confirmation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">How you opted in</h2>
            <p>You consented to receive SMS messages by:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Providing your phone number when booking an appointment through any OYRB-powered booking site, AND</li>
              <li>
                Checking the consent checkbox during checkout that reads: &quot;I consent to receive automated SMS appointment reminders from [beauty professional name] at the phone number provided. Message frequency varies. Message and data rates may apply. Consent is not a condition of any purchase. Reply STOP to unsubscribe, HELP for help. View our SMS Policy.&quot;
              </li>
            </ol>
            <p>
              Consent is captured with a server-side timestamp and IP address for audit purposes. The consent checkbox is unchecked by default, presented as optional, and not a condition of receiving any service or making any purchase.
            </p>
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
            <h2 className="font-display text-2xl font-medium">Delivery limitations</h2>
            <p>
              Carriers are not liable for delayed or undelivered messages. Message delivery is dependent on your mobile carrier&apos;s network and is not guaranteed. Some messages may be delayed or undelivered due to carrier network conditions outside OYRB&apos;s control.
            </p>
            <p>
              This SMS service is available on most major US wireless carriers including AT&amp;T, Verizon, T-Mobile, US Cellular, Boost Mobile, Cricket Wireless, Metro by T-Mobile, and others. Service is not available on all carriers and may be subject to change.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Phone number privacy</h2>
            <p>
              OYRB does not sell, rent, share, or otherwise disclose your phone number to third parties for marketing purposes. Phone numbers collected for SMS are used solely for the appointment-related messages described in this policy. Phone numbers are shared with our SMS delivery provider (Twilio) solely for the purpose of sending the messages described above. For complete details on data practices, see our <a href="/privacy" className="text-[#B8896B] hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">Data retention</h2>
            <p>
              Phone numbers and SMS interaction data (delivery status, opt-in and opt-out timestamps, message content) are retained for the duration of your relationship with the beauty professional plus seven years for legal and tax compliance. After this period, this data is deleted unless required for ongoing legal obligations.
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
              <strong>Manual bookings do not trigger SMS.</strong>{" "}When a beauty professional creates a booking on a client&apos;s behalf through the OYRB dashboard (manual booking entry), OYRB does not send any SMS messages to that client for that booking. Email reminders are still sent if an email address is on file. This applies regardless of subscription tier or any other configuration.
            </p>
            <p>
              <strong>Why this rule exists.</strong>{" "}The Telephone Consumer Protection Act (TCPA) prohibits sending SMS messages to recipients without documented prior express written consent. Violations expose both OYRB and the beauty professional to statutory penalties of $500 to $1,500 per message. OYRB&apos;s SMS sending privileges with our carrier are also at risk if uncontested complaints accumulate, which would interrupt SMS for every professional on the platform.
            </p>
            <p>
              <strong>Verbal consent is not sufficient.</strong> Documented opt-in — a checkbox the client themselves ticks, with timestamp and IP address captured server-side — is the only consent regime that satisfies TCPA. A beauty professional asserting that a client agreed verbally creates no documented record and is not a valid opt-in under federal law. OYRB captures documented consent only when the client checks the SMS consent box themselves during a booking on the public booking widget.
            </p>
            <p>
              <strong>If a client wants SMS reminders for future bookings,</strong> the beauty professional should share their public OYRB booking page link with the client. When the client books their next appointment through the public widget, they will see the SMS consent checkbox and can opt in themselves. Once consented, SMS reminders are sent normally for that and all subsequent bookings with that professional. Existing clients can also opt in retroactively from any booking confirmation page (the link in their confirmation email or SMS). The page now includes an SMS preferences card where they can review the TCPA-required disclosure and check the box themselves at any time.
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
