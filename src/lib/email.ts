import "server-only";

/**
 * Transactional email.
 *
 * Resend's HTTP API is one POST with a bearer key, so there is no SDK and no
 * extra dependency; the key never leaves the server. A blank key is not an
 * error: `emailConfigured()` reports it so the interface can say email is not
 * set up yet instead of pretending a message was delivered.
 *
 * Setup: resend.com → API Keys → create → RESEND_API_KEY. Until a domain is
 * verified there, `onboarding@resend.dev` only delivers to the address that
 * owns the Resend account, which is fine for testing your own sign-in.
 */

const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress() {
  return process.env.EMAIL_FROM?.trim() || "MANDI RELAY <onboarding@resend.dev>";
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type MailResult = { ok: true } | { ok: false; error: string };

/** Never throws: the caller decides what to show when delivery fails. */
export async function sendMail(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, error: "not-configured" };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      return { ok: false, error: `resend-${response.status}${detail ? `: ${detail}` : ""}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "send-failed" };
  }
}

/** The one email this app sends. Plain, readable, and without tracking pixels. */
export function passwordResetMail(input: { to: string; name: string; link: string; minutes: number }): Mail {
  const subject = "Reset your MANDI RELAY password";
  const text = [
    `Hello ${input.name},`,
    "",
    "Someone asked to reset the password for this email address on MANDI RELAY.",
    `Open this link to choose a new password. It works once, within ${input.minutes} minutes:`,
    "",
    input.link,
    "",
    "If this was not you, ignore this message — nothing changes and your current password still works.",
    "",
    "MANDI RELAY",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f7f5ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#22271f">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e0d3;border-radius:6px">
    <tr><td style="padding:24px 24px 0">
      <p style="margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b8574">Mandi Relay</p>
      <h1 style="margin:10px 0 0;font-size:20px;line-height:1.3">Reset your password</h1>
    </td></tr>
    <tr><td style="padding:16px 24px 0">
      <p style="margin:0;font-size:14px;line-height:1.6">Hello ${escapeHtml(input.name)},</p>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.6">
        Someone asked to reset the password for this email address. Choose a new one here — the link
        works once and expires in ${input.minutes} minutes.
      </p>
    </td></tr>
    <tr><td style="padding:20px 24px 0">
      <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#1f4d3a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 18px;border-radius:5px">Choose a new password</a>
    </td></tr>
    <tr><td style="padding:18px 24px 0">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6a60">
        If the button does not open, copy this address into your browser:<br>
        <span style="word-break:break-all;color:#3f4a41">${escapeHtml(input.link)}</span>
      </p>
    </td></tr>
    <tr><td style="padding:18px 24px 24px">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6a60">
        If this was not you, ignore this message. Nothing changes and your current password still works.
      </p>
    </td></tr>
  </table>
</body></html>`;

  return { to: input.to, subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
