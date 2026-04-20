import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = {
  title: "Terms of Service — OYRB",
  description: "Legal terms governing the use of OYRB.",
};

const LAST_UPDATED = "April 18, 2026";
const COMPANY_NAME = "OYRB (Own Your Reality Brand)";
const CONTACT_EMAIL = "support@oyrb.space";
const GOVERNING_STATE = "Georgia";

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="prose prose-stone max-w-none">
          <p className="text-sm text-[#B8896B]">Legal</p>
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Last updated: {LAST_UPDATED}
          </p>

          <div className="mt-6 rounded-md border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
            <strong>⚠️ Draft — pending legal review.</strong> This Terms of Service
            is in draft form. Final language will be published before public
            launch. Sections marked <span className="font-mono text-xs">[LAWYER REVIEW REQUIRED]</span>{" "}
            contain scaffolded copy that is <em>not</em> the final agreement.
          </div>

          <div className="mt-4 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm text-[#525252]">
            <strong>Important:</strong> Please read these Terms carefully before using {COMPANY_NAME}. By accessing or using our Platform, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Platform.
          </div>

          <section className="mt-10 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and {COMPANY_NAME} (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By creating an account, accessing, or using the Platform, its website, mobile applications, APIs, or any related services (collectively, the &quot;Services&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and any additional policies we may publish from time to time. If you are using the Services on behalf of a business or other entity, you represent and warrant that you have the authority to bind such entity to these Terms.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>&quot;Platform&quot;</strong> refers to {COMPANY_NAME}, including the website at oyrb.space, its subdomains, and any related mobile or desktop applications.</li>
              <li><strong>&quot;Professional&quot;</strong> or <strong>&quot;Business Owner&quot;</strong> means a licensed beauty service provider (including but not limited to cosmetologists, estheticians, nail technicians, lash technicians, barbers, makeup artists, and related professionals) who subscribes to the Platform to provide booking and business-management services.</li>
              <li><strong>&quot;Client&quot;</strong> or <strong>&quot;Consumer&quot;</strong> means an individual who uses the Platform to book appointments, purchase services, or otherwise transact with a Professional.</li>
              <li><strong>&quot;Booking&quot;</strong> means an appointment reserved by a Client with a Professional through the Platform.</li>
              <li><strong>&quot;Subscription&quot;</strong> means the recurring paid plan (Starter, Studio, or Scale) purchased by a Professional to access the Services.</li>
              <li><strong>&quot;Deposit&quot;</strong> means any partial payment required by a Professional at the time of Booking.</li>
              <li><strong>&quot;Content&quot;</strong> means all text, images, video, audio, service descriptions, pricing, policies, and other materials uploaded to or displayed on the Platform.</li>
              <li><strong>&quot;Chargeback&quot;</strong> means a forced reversal of a credit card or debit card transaction initiated by a cardholder through their issuing bank or payment network.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">3. Eligibility</h2>
            <p>
              You must be at least 18 years old (or the age of legal majority in your jurisdiction, whichever is greater) and legally capable of entering into binding contracts to use the Services. By using the Platform, you represent and warrant that you meet these eligibility requirements. Professionals additionally represent and warrant that they hold all required professional licenses, permits, and certifications for the services they offer, and that they comply with all applicable state, federal, and local laws and regulations governing their profession.
            </p>
            <p>
              We reserve the right to refuse service, close accounts, or cancel Subscriptions at our sole discretion, including for users who violate these Terms, engage in fraudulent activity, or operate outside the United States without prior written consent.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">4. Account Registration &amp; Security</h2>
            <p>
              To access certain features of the Platform, you must create an account by providing accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
            </p>
            <p>
              We are not liable for any loss or damage arising from your failure to safeguard your credentials. We reserve the right to suspend or terminate accounts that exhibit suspicious activity, including but not limited to multiple failed login attempts, unusual geographic access patterns, or fraudulent payment instruments.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">5. Subscription Plans, Billing, and Cancellation</h2>

            <h3 className="font-medium mt-4">5.1 Subscription Fees</h3>
            <p>
              Professionals pay a recurring monthly fee (Starter: $24/mo, Studio: $49/mo, Scale: $89/mo) to access the Platform. Fees are charged in advance on a monthly basis and are non-refundable except as expressly set forth below or as required by applicable law.
            </p>
            <p>
              <strong>No additional fees or surcharges.</strong> The monthly subscription price listed above is the total amount billed. We do <strong>not</strong> charge per-booking fees, payment-processing surcharges, or take any cut of your client bookings, tips, or deposits — Professionals keep 100% of what their clients pay them. Applicable sales tax, if any, is displayed transparently at checkout and added to the total.
            </p>
            <p>
              <strong>Self-service cancellation.</strong> You may cancel your Subscription at any time, for any reason, from your account settings or through the Stripe Customer Portal accessible at Dashboard → Settings → Manage subscription. Cancellation requires only a single click and takes effect at the end of your current billing period. No phone call, email, or retention process is required.
            </p>

            <h3 className="font-medium mt-4">5.2 Automatic Renewal</h3>
            <p>
              Subscriptions automatically renew each month on the billing anniversary date until cancelled. By subscribing, you authorize us and our payment processor (Stripe, Inc.) to charge your designated payment method for the recurring fee plus any applicable taxes.
            </p>

            <h3 className="font-medium mt-4">5.3 Cancellation Policy</h3>
            <p>
              You may cancel your Subscription at any time from your account dashboard. <strong>Cancellation takes effect at the end of your current billing cycle.</strong> You will retain access to the Services through the end of the prepaid period. We do not offer prorated refunds for unused portions of a billing period, partial months, or unused Services. If you forget to cancel before your renewal date, you remain responsible for the next billing cycle&apos;s fee; the cancellation will apply to the subsequent cycle. <strong>No refunds are issued for subscription periods already charged</strong>, regardless of usage.
            </p>

            <h3 className="font-medium mt-4">5.4 Free Trials</h3>
            <p>
              If we offer a free trial, you must provide a valid payment method to begin. If you do not cancel before the trial ends, you will be automatically charged the then-current subscription fee. Only one trial per user, household, or payment method is permitted.
            </p>

            <h3 className="font-medium mt-4">5.5 Price Changes</h3>
            <p>
              We reserve the right to modify Subscription pricing upon at least thirty (30) days&apos; notice. Continued use of the Services after a price change constitutes acceptance of the new price.
            </p>

            <h3 className="font-medium mt-4">5.6 Taxes</h3>
            <p>
              You are responsible for all applicable taxes, including sales tax, use tax, or value-added tax, associated with your Subscription and with services you deliver to Clients through the Platform.
            </p>

            <h3 className="font-medium mt-4">5.7 Subscription Chargebacks</h3>
            <p>
              <strong>If you initiate a chargeback against the Platform without first contacting us at {CONTACT_EMAIL} and giving us a minimum of fourteen (14) business days to resolve your concern, we consider this a material breach of these Terms.</strong> You agree that (a) a completed Subscription payment, after the benefit of Services has been delivered, constitutes valid and authorized consideration; (b) a chargeback initiated in bad faith constitutes consumer fraud; (c) we may immediately suspend or terminate your account upon receiving a chargeback notification; (d) we may refer fraudulent chargebacks to collection agencies, consumer credit bureaus, or law enforcement; and (e) you agree to pay any chargeback fees imposed by our payment processor (typically $15–$25 per disputed transaction) plus reasonable attorney&apos;s fees if we must pursue collection. We actively dispute all chargebacks we determine to be fraudulent.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">6. Booking Services (Client-to-Professional Transactions)</h2>

            <h3 className="font-medium mt-4">6.1 Multi-Step Booking Confirmation</h3>
            <p>
              When you book an appointment through the Platform, you complete a clear, multi-step process designed to ensure informed, affirmative authorization:
            </p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Selecting the specific service you wish to book;</li>
              <li>Selecting a specific date and time;</li>
              <li>Providing your name, email, and contact information;</li>
              <li>Reviewing the service, date, time, price, and any applicable Deposit;</li>
              <li>Acknowledging the Professional&apos;s cancellation policy and these Terms by affirmative checkbox;</li>
              <li>Clicking &quot;Confirm Booking&quot; — which constitutes explicit, authorized payment and agreement to proceed.</li>
            </ol>
            <p>
              <strong>By completing this multi-step process, you acknowledge that the transaction is authorized, knowing, and voluntary, and you waive any claim of unauthorized use.</strong>
            </p>

            <h3 className="font-medium mt-4">6.2 Booking Chargebacks</h3>
            <p>
              Clients agree that any Booking confirmed through the process described in Section 6.1 constitutes a valid, authorized, and binding transaction. <strong>You may not initiate a chargeback for services rendered, no-shows, late arrivals, dissatisfaction with outcomes, or after the Professional has performed or prepared to perform the service</strong>, except where:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The Professional committed fraud or gross misconduct (e.g., did not show up despite confirming); and</li>
              <li>You have first contacted the Professional AND the Platform at {CONTACT_EMAIL} and attempted good-faith resolution for a minimum of seven (7) calendar days.</li>
            </ul>
            <p>
              Initiating a chargeback in violation of this Section entitles the Platform and/or the Professional to pursue the full amount plus chargeback fees, collection costs, and reasonable attorney&apos;s fees. We maintain records of the multi-step confirmation (including timestamps, IP addresses, and acknowledgment checkboxes) to submit as evidence in chargeback disputes.
            </p>

            <h3 className="font-medium mt-4">6.3 Deposits</h3>
            <p>
              Many Professionals require a nonrefundable Deposit at the time of Booking to reserve the appointment slot. <strong>Deposits are nonrefundable</strong> except where (a) the Professional cancels the appointment without rescheduling; (b) the Professional fails to appear; or (c) the Professional&apos;s posted cancellation policy explicitly provides for a refund. Deposits may be applied toward the final service price at the Professional&apos;s discretion.
            </p>

            <h3 className="font-medium mt-4">6.4 Client Cancellation, No-Show, and Late Arrival</h3>
            <p>
              Each Professional sets their own cancellation, no-show, and late-arrival policies, which are displayed on their booking site. By booking, you acknowledge reading and agreeing to the specific Professional&apos;s policies in addition to these Terms. Typical policies include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Forfeit of Deposit if cancellation occurs less than 24–48 hours before the appointment;</li>
              <li>Full-service charge if you fail to appear (&quot;no-show&quot;);</li>
              <li>Reduced service or forfeit of the appointment if you arrive more than 15 minutes late.</li>
            </ul>

            <h3 className="font-medium mt-4">6.5 Platform Is Not a Party to Service Transactions</h3>
            <p>
              The Platform facilitates bookings between Clients and independent Professionals; we are not the Professional, we do not perform or supervise the service, and we do not guarantee any outcome. All service-delivery disputes are between the Client and the Professional. The Platform may, at its sole discretion and without obligation, assist in mediation.
            </p>

            <h3 className="font-medium mt-4">6.6 Fraudulent Payment Instruments</h3>
            <p>
              Use of a stolen, unauthorized, or fraudulent credit card or other payment method to make a Booking constitutes criminal fraud. We cooperate fully with payment processors, banks, and law enforcement in investigating and prosecuting such activity. Accounts associated with fraudulent payment methods will be immediately terminated and reported.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">7. Professional Responsibilities</h2>
            <p>As a Professional using the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Maintain current, valid professional licenses</strong> for all services offered, and comply with all applicable health, safety, sanitation, and licensing laws;</li>
              <li><strong>Accurately describe services, pricing, duration, and any applicable conditions</strong> on your booking site;</li>
              <li><strong>Honor all confirmed Bookings</strong> except in cases of documented emergency, in which case you will notify the affected Client promptly and reschedule or refund as appropriate;</li>
              <li><strong>Publish a clear cancellation and no-show policy</strong> on your booking site;</li>
              <li><strong>Collect and store Client data in accordance with applicable privacy laws</strong>, including HIPAA if you handle health-related information and your state&apos;s consumer privacy laws (e.g., CCPA for California clients);</li>
              <li><strong>Carry adequate professional liability insurance</strong> to cover your services;</li>
              <li><strong>Report all income</strong> received through the Platform to tax authorities; the Platform does not withhold taxes;</li>
              <li><strong>Not use the Platform to provide any illegal services</strong>, sexually explicit services, or services prohibited by applicable law or payment processor rules;</li>
              <li><strong>Maintain a safe, clean, and professional service environment</strong>;</li>
              <li><strong>Respond to Client inquiries and disputes in a timely and professional manner</strong>;</li>
              <li><strong>Indemnify the Platform</strong> for any claims arising out of your service delivery, workplace conditions, or failure to comply with applicable law.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">8. Client Responsibilities</h2>
            <p>As a Client using the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, complete, and current contact information;</li>
              <li>Arrive at the scheduled appointment time (or follow the Professional&apos;s late-arrival policy);</li>
              <li>Disclose any relevant health conditions, allergies, medications, or physical sensitivities that may affect the service;</li>
              <li>Complete any required intake forms, waivers, or consent forms prior to the service;</li>
              <li>Honor the Professional&apos;s posted policies (cancellation, no-show, late arrival, etc.);</li>
              <li>Pay agreed-upon fees at the time of Booking and/or service completion;</li>
              <li>Treat the Professional and their staff with respect;</li>
              <li>Not engage in fraudulent, abusive, or threatening behavior;</li>
              <li>Not initiate chargebacks except as permitted in Section 6.2.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">9. Professional&apos;s Client Policies</h2>
            <p>
              Each Professional may publish specific client rules and policies on their booking site (e.g., dress code, guest policies, pet policies, conduct policies, grounds for banning). Clients agree to review and abide by these policies as a condition of booking. Repeated violations may result in the Professional refusing service or banning the Client from future Bookings with that Professional. The Platform itself reserves the right to suspend Clients who are banned by multiple Professionals or who engage in repeated disputes, chargebacks, or abusive behavior across the Platform.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">10. Payment Processing</h2>
            <p>
              All payments on the Platform are processed by Stripe, Inc. (&quot;Stripe&quot;). By using the Platform, you agree to be bound by Stripe&apos;s Terms of Service and Privacy Policy (available at https://stripe.com/legal). The Platform does not store full credit card numbers; we receive tokenized payment identifiers from Stripe. Stripe fees (typically 2.9% + $0.30 per transaction for online payments) are the responsibility of the payment recipient. We do not charge per-booking fees to Professionals on top of their Subscription.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">11. Intellectual Property</h2>
            <p>
              The Platform (including all software, templates, design elements, text, graphics, logos, and trademarks) is the exclusive property of {COMPANY_NAME} and its licensors and is protected by U.S. and international copyright, trademark, and other intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Platform solely for its intended purpose during your active Subscription.
            </p>
            <p>
              You retain ownership of Content you upload (business name, bio, service descriptions, photos you upload), but you grant the Platform a worldwide, royalty-free, sublicensable license to host, display, and distribute such Content for the purpose of operating the Platform, facilitating bookings, and promoting your business to Clients. You represent and warrant that you own or have the necessary rights to all Content you upload.
            </p>
            <p>
              Template designs, booking flow UX, and platform architecture remain the intellectual property of {COMPANY_NAME}. Reverse-engineering, copying, or creating derivative works of the Platform is strictly prohibited.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">12. Acceptable Use Policy</h2>
            <p>You agree NOT to use the Platform to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Offer, advertise, or provide services that are illegal under federal, state, or local law;</li>
              <li>Engage in or facilitate adult entertainment, escort services, or sexually explicit services of any kind (prohibited by Stripe and our payment processor terms);</li>
              <li>Misrepresent your identity, credentials, or service offerings;</li>
              <li>Engage in fraudulent, deceptive, or predatory practices;</li>
              <li>Harass, threaten, defame, or discriminate against any person;</li>
              <li>Transmit malware, spam, or harmful code;</li>
              <li>Attempt to gain unauthorized access to the Platform or another user&apos;s account;</li>
              <li>Scrape, data-mine, or extract data from the Platform without written permission;</li>
              <li>Use the Platform to facilitate money laundering or other financial crimes;</li>
              <li>Violate the intellectual property rights of others.</li>
            </ul>
            <p>
              Violation of this Section may result in immediate termination, reporting to law enforcement, and/or civil action.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">13. Termination</h2>
            <p>
              <strong>By You.</strong> You may terminate your account at any time by cancelling your Subscription. Your data remains accessible through the end of your paid period and is retained for thirty (30) days afterward, after which it may be permanently deleted.
            </p>
            <p>
              <strong>By Us.</strong> We may suspend or terminate your account immediately, with or without notice, for any violation of these Terms, suspected fraud, non-payment, or conduct we determine to be harmful to the Platform, other users, or third parties. Upon termination, your right to use the Services ceases. Sections that by their nature should survive termination (including Sections 5.7, 6.2, 11, 14, 15, 16, 17, 18, and 19) shall survive.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">14. Disclaimers</h2>
            <p>
              THE PLATFORM AND SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
            </p>
            <p>
              WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT DEFECTS WILL BE CORRECTED. WE DO NOT WARRANT THE QUALITY, SAFETY, LEGALITY, OR OUTCOME OF SERVICES PROVIDED BY PROFESSIONALS USING THE PLATFORM.
            </p>
            <p>
              WE ARE NOT RESPONSIBLE FOR THIRD-PARTY CONTENT, PRODUCTS, OR SERVICES ACCESSED THROUGH OR IN CONNECTION WITH THE PLATFORM.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">15. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL {COMPANY_NAME}, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOST PROFITS, LOST REVENUE, LOST DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED DOLLARS ($100).
            </p>
            <p>
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR LIMITATION OF LIABILITY, SO SOME OF THESE LIMITATIONS MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">16. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless {COMPANY_NAME}, its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising out of: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property rights or privacy rights; (d) for Professionals, your delivery of services to Clients; (e) for Clients, your transactions with Professionals; (f) your Content; or (g) any fraudulent or unauthorized activity on your account.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">17. Dispute Resolution and Arbitration</h2>

            <h3 className="font-medium mt-4">17.1 Informal Resolution</h3>
            <p>
              Before filing any claim, you agree to contact us at {CONTACT_EMAIL} and attempt in good faith to resolve the dispute informally for at least thirty (30) days.
            </p>

            <h3 className="font-medium mt-4">17.2 Binding Arbitration</h3>
            <p>
              <strong>YOU AND THE PLATFORM AGREE THAT ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL BE RESOLVED BY BINDING ARBITRATION</strong> administered by the American Arbitration Association under its Consumer Arbitration Rules. The arbitration shall take place in the State of {GOVERNING_STATE} (or remotely by mutual agreement). Judgment on the arbitrator&apos;s award may be entered in any court of competent jurisdiction.
            </p>

            <h3 className="font-medium mt-4">17.3 Class Action Waiver</h3>
            <p>
              <strong>YOU AND THE PLATFORM AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.</strong> No class, representative, or private attorney general proceeding is permitted.
            </p>

            <h3 className="font-medium mt-4">17.4 Exceptions</h3>
            <p>
              Notwithstanding the foregoing, either party may (a) bring an action in small-claims court for disputes within the jurisdictional limits of that court; or (b) seek injunctive or equitable relief in a court of competent jurisdiction for intellectual property infringement or other irreparable harm.
            </p>

            <h3 className="font-medium mt-4">17.5 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of {GOVERNING_STATE}, without regard to its conflict-of-laws principles. For any matter not subject to arbitration, exclusive jurisdiction and venue lie in the state and federal courts located in {GOVERNING_STATE}.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">18. Force Majeure</h2>
            <p>
              We shall not be liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, pandemics, war, terrorism, civil unrest, strikes, internet or power outages, or acts of government.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">19. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time at our sole discretion. When we make material changes, we will notify you by (a) updating the &quot;Last updated&quot; date at the top of this page; and (b) for material changes affecting your rights, providing at least thirty (30) days&apos; notice via email or in-platform notice. Continued use of the Platform after the effective date of updated Terms constitutes acceptance of the new Terms. If you do not agree, you must stop using the Platform and cancel your Subscription.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">20. General Provisions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Entire Agreement.</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and us and supersede all prior agreements.</li>
              <li><strong>Severability.</strong> If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall remain in full force and effect.</li>
              <li><strong>Waiver.</strong> Our failure to enforce any right or provision shall not be deemed a waiver of such right.</li>
              <li><strong>Assignment.</strong> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.</li>
              <li><strong>No Agency.</strong> Nothing in these Terms creates an agency, partnership, joint venture, or employment relationship.</li>
              <li><strong>Headings.</strong> Section headings are for convenience only and do not affect interpretation.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">21. Image Use and User Representations</h2>
            <p className="rounded bg-amber-50 px-2 py-1 text-xs font-mono text-amber-900">
              [LAWYER REVIEW REQUIRED — DRAFT TEXT BELOW]
            </p>
            <p>
              By uploading, selecting, or publishing any image on your site —
              including stock photos sourced from third-party libraries such
              as Unsplash — you represent and warrant that: (a) you have the
              legal right to use the image; (b) you will not use stock photos
              in a manner that misrepresents your services, results,
              qualifications, or actual work product; (c) you will not imply
              that any person, model, or subject depicted in a stock photo is
              your client, has used your services, or endorses your business;
              (d) you will comply with the licensing terms of any third-party
              image source; (e) you acknowledge that stock photos are
              illustrative only and do not represent guaranteed service
              outcomes. You are solely responsible for all images displayed on
              your site.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">22. Stock Photo Disclosure Requirement</h2>
            <p className="rounded bg-amber-50 px-2 py-1 text-xs font-mono text-amber-900">
              [LAWYER REVIEW REQUIRED — DRAFT TEXT BELOW]
            </p>
            <p>
              When stock photos are used on your site, {COMPANY_NAME}
              automatically displays a disclaimer in the site footer noting
              that stock photos may be present for illustrative purposes.
              Removing, obscuring, or modifying this platform-enforced
              disclosure is a violation of these Terms and may result in
              account suspension. You agree not to use stock photos in any
              manner that misrepresents your services, results, or actual
              work product to clients.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">23. Indemnification (Image Use)</h2>
            <p className="rounded bg-amber-50 px-2 py-1 text-xs font-mono text-amber-900">
              [LAWYER REVIEW REQUIRED — DRAFT TEXT BELOW]
            </p>
            <p>
              You agree to indemnify, defend, and hold harmless {COMPANY_NAME},
              its owners, employees, and affiliates from any claims, damages,
              losses, or expenses (including attorneys&apos; fees) arising
              from: (a) your use of any image on your site; (b) any claim that
              images on your site misrepresented your services or results;
              (c) infringement of intellectual property, model release, or
              publicity rights; (d) violation of third-party stock photo
              licensing terms.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">24. Platform Attribution</h2>
            <p className="rounded bg-amber-50 px-2 py-1 text-xs font-mono text-amber-900">
              [LAWYER REVIEW REQUIRED — DRAFT TEXT BELOW]
            </p>
            <p>
              Every site published through {COMPANY_NAME} displays a
              &ldquo;Powered by OYRB&rdquo; credit in the footer, linking to{" "}
              <a href="https://oyrb.space" className="text-[#B8896B] hover:underline">oyrb.space</a>.
              Removal, modification, or obscuring of this credit — whether
              through the editor, custom CSS, custom HTML, custom JavaScript,
              third-party tooling, or re-hosting exported HTML — is a
              violation of these Terms and may result in account suspension
              or termination, in addition to any legal remedies available to
              {" "}{COMPANY_NAME}.
            </p>
          </section>

          <section className="mt-8 space-y-4 text-[#2a2a2a]">
            <h2 className="font-display text-2xl font-medium">25. Contact</h2>
            <p>
              Questions about these Terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#B8896B] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <div className="mt-16 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-xs text-[#737373]">
            This document provides general terms for using the Platform. It does not constitute legal advice. For specific legal guidance applicable to your situation, consult a licensed attorney.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
