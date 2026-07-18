import "server-only";

// Thin Resend wrapper over the REST API (no SDK dependency). Sending is
// best-effort: if RESEND_API_KEY isn't configured, or a send fails, this
// no-ops/logs and never throws — email must never break the in-app flow
// that triggered it.
//
// Env:
//   RESEND_API_KEY  — enables sending. Unset => disabled (dev/no-vendor).
//   EMAIL_FROM      — verified sender, e.g. "UREC <noreply@yourdomain>".
//                     Falls back to Resend's shared test sender.
//   APP_URL         — base URL used to build links in emails.

const RESEND_ENDPOINT = "https://api.resend.com/emails/batch";
const FROM = process.env.EMAIL_FROM || "UREC <onboarding@resend.dev>";

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function appUrl(path = "/") {
  const base = (process.env.APP_URL || "https://urec-website.vercel.app").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type Mail = { to: string; subject: string; html: string };

/**
 * Send individually-addressed emails (each recipient gets their own
 * message, never a shared To: header). Batches of up to 100 per Resend's
 * batch endpoint. Returns silently on any failure.
 */
export async function sendEmails(mails: Mail[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key || mails.length === 0) return;

  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => ({
      from: FROM,
      to: [m.to],
      subject: m.subject,
      html: m.html,
    }));
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error(`Resend batch failed: ${res.status} ${await res.text().catch(() => "")}`);
      }
    } catch (e) {
      console.error("Resend batch error:", e);
    }
  }
}

/** Minimal, dependency-free HTML shell for a notification email. */
export function notificationHtml(opts: { title: string; body?: string | null; linkPath?: string }) {
  const link = appUrl(opts.linkPath || "/dashboard");
  const bodyHtml = opts.body
    ? `<p style="margin:0 0 16px;color:#273540;font-size:15px;line-height:1.5;">${escapeHtml(opts.body)}</p>`
    : "";
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
    <div style="border:1px solid #E8EAEC;border-radius:10px;overflow:hidden;">
      <div style="background:#273540;padding:16px 20px;">
        <span style="color:#fff;font-weight:700;font-size:15px;letter-spacing:.02em;">UREC</span>
      </div>
      <div style="padding:22px 20px;">
        <h1 style="margin:0 0 12px;color:#273540;font-size:18px;">${escapeHtml(opts.title)}</h1>
        ${bodyHtml}
        <a href="${link}" style="display:inline-block;background:#2B7ABC;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:6px;">Open in UREC</a>
      </div>
    </div>
    <p style="margin:14px 4px 0;color:#6A7883;font-size:12px;">
      You're getting this because you're a member of the UREC platform. Manage notifications from your account in the app.
    </p>
  </div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
