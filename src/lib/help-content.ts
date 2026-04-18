// OYRB Help Center content — all guides, steps, and error fixes

export interface HelpStep {
  text: string;
  note?: string; // optional tip or warning
}

export interface HelpGuide {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
  relatedIds?: string[];
}

export interface HelpCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  guides: HelpGuide[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  // ── Getting Started ────────────────────────────────────────────────────────
  {
    id: "start",
    label: "Getting Started",
    icon: "🚀",
    color: "#8B5CF6",
    guides: [
      {
        id: "start-account",
        title: "Create your OYRB account",
        summary: "Set up your account and go live in under 10 minutes.",
        steps: [
          { text: "Go to oyrb.co and click Get Started." },
          { text: "Enter your email address and create a password (at least 8 characters)." },
          { text: "Check your inbox for a verification email and click the link inside.", note: "Check your spam folder if you don't see it within 2 minutes." },
          { text: "Complete your business profile: name, category, location, and phone number." },
          { text: "Choose a template from the gallery — you can change it any time." },
          { text: "Your booking page is now live! Share the link with your clients." },
        ],
        relatedIds: ["start-profile", "template-pick"],
      },
      {
        id: "start-profile",
        title: "Set up your business profile",
        summary: "Add your name, bio, photos, and contact info.",
        steps: [
          { text: "From your Dashboard, click Profile in the left sidebar." },
          { text: "Upload a profile photo (square images work best, minimum 400×400px)." },
          { text: "Upload a cover/hero image (minimum 1200×600px for best quality).", note: "OYRB supports JPG, PNG, and WebP files up to 10MB." },
          { text: "Write a short bio (2–3 sentences) describing your specialty and style." },
          { text: "Add your phone number and Instagram handle if you have one." },
          { text: "Click Save. Changes appear on your booking page immediately." },
        ],
        relatedIds: ["hours-add", "location-add"],
      },
      {
        id: "start-share",
        title: "Share your booking page",
        summary: "Get your link and put it everywhere.",
        steps: [
          { text: "Go to Dashboard → Your Page." },
          { text: "Copy your booking link (format: oyrb.co/book/your-handle)." },
          { text: "Add it to your Instagram bio as your link-in-bio." },
          { text: "Add it to your Facebook page's website field." },
          { text: "Text it directly to your existing clients — they can bookmark it on their phone." },
          { text: "On the Scale plan, you can connect a custom domain like book.yoursalon.com.", note: "Custom domains are set up in Dashboard → Settings → Domain." },
        ],
      },
    ],
  },

  // ── Payments & Stripe ──────────────────────────────────────────────────────
  {
    id: "payments",
    label: "Payments & Stripe",
    icon: "💳",
    color: "#10B981",
    guides: [
      {
        id: "payments-connect",
        title: "Connect Stripe to accept payments",
        summary: "Link your Stripe account so clients can pay you directly.",
        steps: [
          { text: "From Dashboard, go to Settings → Payments." },
          { text: "Click Connect with Stripe.", note: "You'll be redirected to Stripe's secure setup page." },
          { text: "If you don't have a Stripe account, click Create account — it's free." },
          { text: "Enter your legal name, date of birth, and last 4 digits of your SSN (Stripe requires this to verify your identity)." },
          { text: "Add your bank account or debit card where payouts will be sent." },
          { text: "Return to OYRB — you'll see a green 'Connected' badge when setup is complete." },
          { text: "Your clients can now pay by credit/debit card when they book." },
        ],
        relatedIds: ["payments-deposit", "payments-payout"],
      },
      {
        id: "payments-deposit",
        title: "Require a deposit at booking",
        summary: "Protect your time — charge a deposit upfront.",
        steps: [
          { text: "Go to Dashboard → Settings → Payments → Deposit Settings." },
          { text: "Toggle Require deposit ON." },
          { text: "Choose a deposit type: Fixed amount (e.g. $25) or Percentage (e.g. 25% of service price)." },
          { text: "Set your deposit amount." },
          { text: "Choose whether the deposit is refundable — and set your cancellation window (e.g. refundable if cancelled 48+ hours before)." },
          { text: "Click Save. All new bookings will require the deposit to confirm." },
          { text: "Deposits go directly to your Stripe account minus Stripe's processing fee (~2.9% + 30¢)." },
        ],
        relatedIds: ["payments-refund", "payments-payout"],
      },
      {
        id: "payments-payout",
        title: "When and how you get paid",
        summary: "Understand your payout schedule.",
        steps: [
          { text: "Stripe sends payouts to your bank account on a rolling 2-day schedule by default (money received Monday hits your bank Wednesday)." },
          { text: "For new Stripe accounts, the first payout may take 7–10 business days while Stripe verifies your account." },
          { text: "To check your balance and payout history: Dashboard → Payments → Payout History, or log into your Stripe dashboard directly at dashboard.stripe.com." },
          { text: "OYRB charges no per-booking fee. You only pay Stripe's processing fee (2.9% + 30¢ per transaction). OYRB never touches your money — payments go directly Stripe → your bank." },
        ],
      },
      {
        id: "payments-refund",
        title: "Issue a refund to a client",
        summary: "Refund a deposit or full payment.",
        steps: [
          { text: "Go to Dashboard → Bookings and find the appointment." },
          { text: "Click on the booking to open it." },
          { text: "Click Refund Payment." },
          { text: "Choose Full refund or Partial refund and enter the amount." },
          { text: "Click Confirm Refund.", note: "Refunds appear on the client's card within 5–10 business days. Stripe's processing fee is not returned." },
        ],
      },
    ],
  },

  // ── Hours & Schedule ───────────────────────────────────────────────────────
  {
    id: "hours",
    label: "Hours & Schedule",
    icon: "🕐",
    color: "#F59E0B",
    guides: [
      {
        id: "hours-add",
        title: "Set your business hours",
        summary: "Tell clients when you're available to book.",
        steps: [
          { text: "Go to Dashboard → Schedule → Business Hours." },
          { text: "For each day of the week, toggle ON or OFF." },
          { text: "For days you're open, set your open time and close time using the dropdowns." },
          { text: "If you have a lunch break or mid-day gap, toggle Split hours and add a second time block.", note: "Example: 9:00 AM–12:00 PM and 1:00 PM–6:00 PM." },
          { text: "Click Save Hours." },
          { text: "Your updated hours will appear on your booking page within seconds." },
        ],
        relatedIds: ["hours-block", "hours-timezone"],
      },
      {
        id: "hours-timezone",
        title: "Change your timezone",
        summary: "Make sure bookings show in your local time.",
        steps: [
          { text: "Go to Dashboard → Settings → General." },
          { text: "Find the Timezone dropdown." },
          { text: "Start typing your city or select your timezone from the list (e.g. Eastern Time, Central Time)." },
          { text: "Click Save.", note: "All your existing booking times will automatically adjust to display correctly in your new timezone." },
        ],
      },
      {
        id: "hours-block",
        title: "Block off time / set days off",
        summary: "Mark vacation days or block specific time slots.",
        steps: [
          { text: "Go to Dashboard → Schedule → Blocked Time." },
          { text: "Click + Block Time." },
          { text: "Select the date(s) you want to block." },
          { text: "Choose All day (no bookings at all) or a specific time range." },
          { text: "Optionally add a note for yourself (e.g. 'Vacation', 'Doctor appointment').", note: "Clients will not see your note — they'll just see you as unavailable." },
          { text: "Click Save Block." },
        ],
      },
      {
        id: "hours-buffer",
        title: "Add buffer time between appointments",
        summary: "Give yourself time to clean up between clients.",
        steps: [
          { text: "Go to Dashboard → Settings → Booking Rules." },
          { text: "Find Buffer Time Between Appointments." },
          { text: "Select your buffer (15 min, 30 min, 45 min, or 1 hour)." },
          { text: "Click Save.", note: "OYRB will automatically block this buffer after every appointment so clients can't book back-to-back with no gap." },
        ],
      },
    ],
  },

  // ── Location & Contact ─────────────────────────────────────────────────────
  {
    id: "location",
    label: "Location & Contact",
    icon: "📍",
    color: "#EF4444",
    guides: [
      {
        id: "location-add",
        title: "Add or update your location",
        summary: "Show clients exactly where you're located.",
        steps: [
          { text: "Go to Dashboard → Profile → Location." },
          { text: "Type your studio address in the search bar — select from the autocomplete suggestions.", note: "If you work from home and want privacy, you can enter just your city and state (e.g. 'Atlanta, GA') instead of a full street address." },
          { text: "If you operate mobile (you go to the client), toggle Mobile Provider ON. Your location will show as 'Mobile — [City]'." },
          { text: "Add any location notes for clients (e.g. 'Park in rear lot, enter through blue door', 'Suite 4 — second floor')." },
          { text: "Click Save Location." },
        ],
      },
      {
        id: "location-virtual",
        title: "Set up for virtual or mobile services",
        summary: "For mobile artists or virtual consultations.",
        steps: [
          { text: "Go to Dashboard → Profile → Location." },
          { text: "Toggle Mobile / Virtual Provider ON." },
          { text: "Under Service Area, enter the cities or zip codes you travel to." },
          { text: "Under Services, you can mark individual services as 'in-studio only' or 'mobile available' for each one." },
          { text: "Add your travel fee (if any) under Settings → Pricing → Travel Fee." },
          { text: "Click Save." },
        ],
      },
      {
        id: "location-contact",
        title: "Update phone number or email",
        summary: "Change how clients can reach you.",
        steps: [
          { text: "Go to Dashboard → Settings → Account." },
          { text: "Update your phone number in the Contact Info section.", note: "Your phone number is shown on your booking page. If you prefer not to show it, toggle Show phone number OFF." },
          { text: "To change your login email, enter the new email and click Send Verification." },
          { text: "Check your new email inbox and click the verification link." },
          { text: "Your email is updated once verified." },
        ],
      },
    ],
  },

  // ── Services & Pricing ─────────────────────────────────────────────────────
  {
    id: "services",
    label: "Services & Pricing",
    icon: "✂️",
    color: "#EC4899",
    guides: [
      {
        id: "services-add",
        title: "Add a new service",
        summary: "Create a bookable service with price and duration.",
        steps: [
          { text: "Go to Dashboard → Services → + Add Service." },
          { text: "Enter a service name (e.g. 'Silk Press', 'Full Set Acrylics')." },
          { text: "Set the duration — how long the appointment takes from start to finish." },
          { text: "Set the price. If it varies, check Variable pricing and add a starting price.", note: "Variable pricing shows as '$85+' on your booking page." },
          { text: "Add a short description — clients see this when choosing. Be specific: 'Includes blowout and style'." },
          { text: "Add a service photo (optional but highly recommended — it increases bookings)." },
          { text: "Click Save Service. It's immediately live on your booking page." },
        ],
      },
      {
        id: "services-edit",
        title: "Edit or hide a service",
        summary: "Update pricing, duration, or temporarily hide a service.",
        steps: [
          { text: "Go to Dashboard → Services and click on the service you want to edit." },
          { text: "Make your changes (name, price, duration, description)." },
          { text: "To temporarily remove it from your page without deleting: toggle Active OFF.", note: "Hidden services are not visible to clients but all data is saved. You can re-activate anytime." },
          { text: "Click Save." },
        ],
      },
    ],
  },

  // ── Templates & Design ────────────────────────────────────────────────────
  {
    id: "templates",
    label: "Templates & Design",
    icon: "🎨",
    color: "#D946EF",
    guides: [
      {
        id: "template-pick",
        title: "Choose or switch your template",
        summary: "Pick a new look for your booking page anytime.",
        steps: [
          { text: "Go to Dashboard → My Page → Template." },
          { text: "Browse the 48 templates — use the filters to narrow by style (Feminine, Editorial, Minimal, etc.)." },
          { text: "Click Preview on any template to see a live preview with your actual business data." },
          { text: "Click Use This Template to apply it.", note: "Switching templates does not affect your bookings, services, or any data — only the look of your page changes." },
          { text: "Your new template is live immediately." },
        ],
      },
      {
        id: "template-colors",
        title: "Customize template colors",
        summary: "Adjust colors to match your brand.",
        steps: [
          { text: "Go to Dashboard → My Page → Customize." },
          { text: "Click on any color swatch to open the color picker." },
          { text: "Enter your brand's hex code (e.g. #FF6EC7) or use the color picker to choose visually." },
          { text: "Changes preview live on the right side of the screen." },
          { text: "Click Save Customization when happy with your colors." },
          { text: "Studio and Scale plan subscribers can save multiple color presets." },
        ],
      },
    ],
  },

  // ── Managing Bookings ──────────────────────────────────────────────────────
  {
    id: "bookings",
    label: "Managing Bookings",
    icon: "📅",
    color: "#3B82F6",
    guides: [
      {
        id: "bookings-view",
        title: "View and manage your appointments",
        summary: "See upcoming bookings and client details.",
        steps: [
          { text: "Go to Dashboard → Bookings to see all upcoming appointments." },
          { text: "Switch between List view and Calendar view using the toggle at the top." },
          { text: "Click any appointment to see full details: client name, service, time, payment status, and any intake form answers." },
          { text: "From the booking detail view you can: Confirm, Cancel, Reschedule, or Refund the appointment." },
        ],
      },
      {
        id: "bookings-cancel",
        title: "Cancel or reschedule an appointment",
        summary: "Cancel a booking and optionally notify the client.",
        steps: [
          { text: "Go to Dashboard → Bookings and click the appointment." },
          { text: "Click Cancel Appointment (or Reschedule)." },
          { text: "For cancel: choose whether to issue a refund (if a deposit was paid)." },
          { text: "Choose to send the client an automatic cancellation notification via email.", note: "OYRB sends a professional cancellation email with your name and any message you add." },
          { text: "Click Confirm Cancellation." },
        ],
        relatedIds: ["payments-refund"],
      },
      {
        id: "bookings-reminders",
        title: "Set up automatic reminders",
        summary: "OYRB texts and emails clients before their appointment.",
        steps: [
          { text: "Go to Dashboard → Settings → Notifications." },
          { text: "Under Client Reminders, toggle ON email reminders and/or SMS reminders.", note: "SMS reminders are available on the Studio and Scale plans." },
          { text: "Set when to send them: 24 hours before, 48 hours before, or both." },
          { text: "Customize the reminder message (or leave the default)." },
          { text: "Click Save. OYRB will automatically send reminders to all future bookings." },
        ],
      },
    ],
  },

  // ── Error Messages ────────────────────────────────────────────────────────
  {
    id: "errors",
    label: "Error Messages",
    icon: "⚠️",
    color: "#F97316",
    guides: [
      {
        id: "error-stripe-connect",
        title: '"Stripe account not connected"',
        summary: "Fix payment setup errors.",
        steps: [
          { text: "This means your Stripe account isn't fully verified yet." },
          { text: "Go to Dashboard → Settings → Payments and click View Stripe Status." },
          { text: "Stripe will show you exactly what information is still needed (usually a document upload or bank account confirmation)." },
          { text: "Complete all required fields in your Stripe dashboard." },
          { text: "Return to OYRB — the error should clear within a few minutes once Stripe verifies your info.", note: "If it still shows after 24 hours, email support@oyrb.co with your account email." },
        ],
      },
      {
        id: "error-image-upload",
        title: '"Image failed to upload"',
        summary: "Fix photo upload errors.",
        steps: [
          { text: "Check your image size — OYRB supports files up to 10MB. Compress larger files using squoosh.app (free, works in your browser)." },
          { text: "Check the file type — only JPG, PNG, and WebP are accepted. Convert HEIC files (iPhone format) by opening in Photos → Export → JPG." },
          { text: "Check your internet connection — large file uploads can fail on slow connections. Try again on WiFi." },
          { text: "Try a different browser (Chrome or Safari work best) and clear your cache.", note: "If the error persists with a file under 10MB in the correct format, contact support." },
        ],
      },
      {
        id: "error-booking-fail",
        title: '"Booking failed to confirm"',
        summary: "What to do when a client can't complete a booking.",
        steps: [
          { text: "This usually means a payment error. Ask your client to check their card number and expiry date." },
          { text: "Their card may have been declined by their bank — ask them to try a different card or contact their bank." },
          { text: "Check that your Stripe account is active and fully verified (Dashboard → Settings → Payments)." },
          { text: "If the slot shows as unavailable but shouldn't be, go to Dashboard → Schedule → Blocked Time and check for any accidentally blocked slots.", note: "Clients always receive a clear error message explaining why their booking failed." },
        ],
      },
      {
        id: "error-page-not-found",
        title: '"Page not found" on your booking link',
        summary: "Your booking page isn't loading.",
        steps: [
          { text: "Check that you're using the correct link format: oyrb.co/book/your-handle (find it in Dashboard → My Page)." },
          { text: "Make sure your account is active — if your trial expired, your page goes offline. Go to Dashboard → Settings → Billing to renew." },
          { text: "If using a custom domain, verify your DNS records are still pointed correctly (Dashboard → Settings → Domain → DNS Guide)." },
          { text: "Try opening the link in an incognito/private browser window to rule out a cache issue.", note: "If your page is down for a reason not listed here, email support@oyrb.co — we respond within 2 hours." },
        ],
      },
      {
        id: "error-login",
        title: "Can't log in / forgot password",
        summary: "Recover access to your account.",
        steps: [
          { text: "Go to oyrb.co/login and click Forgot password." },
          { text: "Enter the email address you signed up with." },
          { text: "Check your inbox for the reset email (check spam too).", note: "The reset link expires after 1 hour — request a new one if it doesn't arrive." },
          { text: "Click the link, enter a new password, and log in." },
          { text: "If you don't remember which email you used, contact support@oyrb.co from any email and we'll look it up." },
        ],
      },
      {
        id: "error-sms",
        title: "SMS reminders not sending",
        summary: "Fix text message notification issues.",
        steps: [
          { text: "Confirm your plan includes SMS — this feature requires Studio or Scale plan." },
          { text: "Go to Dashboard → Settings → Notifications and confirm SMS reminders are toggled ON." },
          { text: "Check that your clients' phone numbers are saved in the correct format (10 digits, US numbers only)." },
          { text: "Make sure the reminder is set to send before the appointment — not after.", note: "SMS messages can occasionally be delayed by carrier networks. If a client didn't receive a reminder, you can manually send a message from the booking detail page." },
        ],
      },
    ],
  },
];

// Flatten all guides for search
export function getAllGuides(): (HelpGuide & { categoryId: string; categoryLabel: string; categoryIcon: string })[] {
  return HELP_CATEGORIES.flatMap((cat) =>
    cat.guides.map((guide) => ({
      ...guide,
      categoryId: cat.id,
      categoryLabel: cat.label,
      categoryIcon: cat.icon,
    }))
  );
}

export function searchGuides(query: string) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return getAllGuides().filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.steps.some((s) => s.text.toLowerCase().includes(q))
  );
}
