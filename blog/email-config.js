// EmailJS configuration for the "Share as Word doc" send-for-review feature.
// Leave any of these blank and Share falls back to: download the .docx +
// open a pre-filled email draft for you to attach it to by hand.
//
// EmailJS's "Public Key" is meant to be used in client-side code exactly
// like this (it's the same idea as a Stripe "publishable" key) — it is not
// a secret. Still, once this is live, go to your EmailJS dashboard →
// Account → Security → "Allowed origins" and restrict it to your real site
// URL, so the key can't be picked up from view-source and reused elsewhere.
//
// --- One-time setup (free account) ---
// 1. Sign up at https://www.emailjs.com
// 2. Email Services → Add New Service → connect the email account you want
//    replies to come from → copy its Service ID below.
// 3. Email Templates → Create New Template. Set:
//      To Email:  {{to_email}}
//      Subject:   {{subject}}
//      Content:   {{message}}
//    Then open the template's "Attachments" tab → Add Attachment →
//    "Variable Attachment" → Parameter name: attachment
//    (this exact name — it's what the code below sends) → give it a
//    filename like "draft-for-review.docx" → Save. Copy the Template ID.
// 4. Account → General → copy your Public Key.
// 5. Paste all three below and commit — no other code changes needed.
//
// Free tier: ~200 emails/month, attachments up to 500KB (a blog draft is a
// few KB, so there's plenty of headroom).

export const EMAILJS_CONFIG = {
  publicKey: "",
  serviceId: "",
  templateId: "",
};
