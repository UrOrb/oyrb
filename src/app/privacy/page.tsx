import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "Privacy Policy — OYRB",
  description: "How OYRB collects, uses, and protects your data.",
};

const LAST_UPDATED = "April 22, 2026";
const EFFECTIVE_DATE = "April 22, 2026";
const CONTACT_EMAIL = "support@oyrb.space";
const PRIVACY_VERSION = "v1.1";
const COMPANY_NAME = "OYRB LLC, a Georgia limited liability company";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-sm text-[#B8896B]">Legal</p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[#737373]">
          Effective: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED} · Version {PRIVACY_VERSION}
        </p>

        <div className="mt-10 space-y-8 text-[#2a2a2a]">
          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">1. Overview</h2>
            <p>
              {COMPANY_NAME} (&quot;OYRB&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This Privacy Policy describes how we collect, use, disclose, and protect information in connection with your use of our Platform at oyrb.space. By using the Platform, you consent to this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">2. Information We Collect</h2>
            <h3 className="font-medium mt-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account info:</strong> name, email, password (hashed), profile photo, business name, phone.</li>
              <li><strong>Business info (Professionals):</strong> services offered, pricing, hours, location, bio, gallery images, tagline, social links.</li>
              <li><strong>Booking info (Clients):</strong> name, email, phone, notes, service selected, date/time, and any intake form responses.</li>
              <li><strong>Payment info:</strong> we do not store full card numbers. Stripe, Inc. processes and stores this data per their PCI-DSS certified practices.</li>
              <li><strong>Communications:</strong> emails and messages you send to support.</li>
            </ul>
            <h3 className="font-medium mt-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Usage data:</strong> pages visited, actions taken, device type, browser, IP address, timestamps.</li>
              <li><strong>Cookies &amp; similar technologies:</strong> used for authentication, session management, and analytics.</li>
              <li><strong>Location:</strong> approximate location from IP address or (with permission) precise location via your browser, used to show featured businesses near you.</li>
            </ul>
            <h3 className="font-medium mt-3">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google (if you sign in with Google):</strong> name, email, profile image.</li>
              <li><strong>Stripe:</strong> subscription and payment status.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">3. How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, operate, and maintain the Platform;</li>
              <li>To process bookings and payments;</li>
              <li>To send booking confirmations, reminders, receipts, and account notifications;</li>
              <li>To respond to customer support requests;</li>
              <li>To detect, prevent, and investigate fraud, abuse, and security issues;</li>
              <li>To improve Platform features and user experience through analytics;</li>
              <li>To comply with legal obligations and enforce our Terms.</li>
            </ul>
            <p>
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">4. How We Share Information</h2>
            <p>We share information only as described here:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>With Professionals you book with:</strong> your name, email, phone, booking details, and any notes you provide.</li>
              <li><strong>With Clients who book you (Professionals only):</strong> client-provided contact and booking info.</li>
              <li><strong>Service providers:</strong> Stripe (payments), Supabase (database &amp; authentication), Resend (transactional email), Vercel (hosting &amp; CDN), Unsplash (stock photos), Google (OAuth), ImprovMX (email forwarding).</li>
              <li><strong>Legal &amp; safety:</strong> to comply with law, respond to lawful requests, or protect rights, property, or safety.</li>
              <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, user data may be transferred.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account &amp; business data:</strong> retained for as long as your Subscription is active.</li>
              <li><strong>After cancellation or termination:</strong> retained for ninety (90) days as a reactivation window, then permanently deleted from production systems.</li>
              <li><strong>Payment &amp; transaction records:</strong> retained for seven (7) years as required by IRS and state tax-record rules. We never store full card numbers — Stripe handles those.</li>
              <li><strong>System backups:</strong> rotated out within thirty (30) days, after which the deleted data cannot be recovered from backups either.</li>
              <li><strong>Directory listing data:</strong> removed from the public directory within five (5) minutes of delisting; cached search-engine snapshots may take additional time to clear at the search engine&apos;s discretion.</li>
              <li><strong>Consent records (Terms, Privacy, Directory acceptance):</strong> retained for the life of the account plus seven (7) years for legal-defense and audit purposes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access, correct, or delete your personal data;</li>
              <li>Object to or restrict certain processing;</li>
              <li>Data portability;</li>
              <li>Withdraw consent where processing is based on consent;</li>
              <li>Lodge a complaint with a supervisory authority.</li>
            </ul>
            <p>
              <strong>California residents (CCPA/CPRA):</strong> you have the right to know what personal information we collect, to request deletion, to correct inaccuracies, and to opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information (we do not sell or share for cross-context behavioral advertising).
            </p>
            <p>
              To exercise any rights, contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#B8896B] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">7. Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect personal data, including TLS encryption in transit, encrypted database storage (Supabase), and access controls. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>
            <p>
              We will notify affected users of a data breach involving their personal information in accordance with applicable law (typically within 72 hours of discovery).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">8. Age Requirement &amp; Children&apos;s Privacy</h2>
            <p>
              The Platform is not intended for users under the age of 18. By creating a Professional account or Client account, you confirm that you are at least 18 years old. We do not knowingly collect personal information from anyone under 18. If we learn that an account belongs to a user under 18, we will delete the account and the associated personal data, and (where required by law) notify the user&apos;s parent or guardian.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">9. International Users</h2>
            <p>
              The Platform is operated in the United States. By using the Platform, you consent to the transfer of your data to the United States, which may have different data-protection laws than your country.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">10. Directory Data</h2>
            <p>
              When you opt into the OYRB public directory, the specific information you have selected in your Directory settings becomes publicly visible at <a href="https://oyrb.space/find" className="text-[#B8896B] hover:underline">oyrb.space/find</a>. You control exactly what is shown — every field is opt-in, and your business name is the only required field.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>You may allow or disallow search-engine indexing via a separate explicit toggle. When disabled, OYRB serves a <code>noindex</code> tag so search engines should not list your directory page.</li>
              <li>You can delist at any time from your Dashboard. The public listing is removed within five (5) minutes; cached search-engine snapshots may take additional time to clear.</li>
              <li>OYRB does not sell directory data to third parties. Aggregated, de-identified directory statistics may be published for marketing or research.</li>
              <li>Each acceptance of the Directory Agreement is recorded with timestamp + version in the <code>directory_consent_log</code> table for audit purposes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">11. Cookies &amp; Tracking</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Essential cookies:</strong> required for authentication, session continuity, CSRF protection, and basic Platform functionality. Disabling these prevents you from signing in.</li>
              <li><strong>Analytics:</strong> Vercel Analytics records aggregated, IP-anonymized page-view data to help us improve the Platform. No third-party advertising trackers, no cross-site tracking pixels, no behavioral-ad cookies.</li>
              <li><strong>Stripe Checkout:</strong> when you reach a payment screen, Stripe sets its own cookies governed by Stripe&apos;s privacy policy.</li>
            </ul>
            <p>
              We do not participate in the IAB Transparency &amp; Consent Framework or any ad-tech bidstream. There is no advertising on the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be notified via email or in-platform notice at least 30 days before taking effect. The &quot;Last updated&quot; date reflects the most recent version.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-medium">13. Contact</h2>
            <p>
              Privacy questions or requests? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#B8896B] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
