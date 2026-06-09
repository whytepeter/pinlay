/**
 * Transactional email — thin wrapper around Resend's HTTP API. No SDK,
 * just `fetch`, so there's no extra dep to install or version-pin.
 *
 * Three modes via `MAIL_PROVIDER`:
 *   • `resend`   — send for real (needs MAIL_API_KEY).
 *   • `disabled` — log the payload and return. Default in dev so a missing
 *                  key doesn't break the invite flow.
 *
 * Every send is best-effort: `WorkspaceService.inviteMember` fires this
 * fire-and-forget. A bad Resend response logs a warning; nothing throws.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { env } from "../config/env";

// Read once at module load (a few KB; lives in memory for the API lifetime).
// Attached to every send under CID "pinlay-logo" — Resend supports `cid:`
// references for inline images, which renders in EVERY major email client
// including Gmail (data: URIs and hosted images don't, in many of them).
const LOGO_PNG_BASE64 = readFileSync(
  join(__dirname, "assets", "logo.png"),
).toString("base64");
const LOGO_CID = "pinlay-logo";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface ResendAttachment {
  filename: string;
  content: string; // base64
  content_id?: string; // for `<img src="cid:...">` references
}

interface InvitePayload {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}

interface WelcomePayload {
  to: string;
  name: string;
  workspaceName: string;
  dashboardUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInvite(p: InvitePayload): Promise<void> {
    await this.send({
      to: p.to,
      subject: `${p.inviterName} invited you to ${p.workspaceName} on pinlay`,
      html: inviteHtml(p),
      text: inviteText(p),
    });
  }

  async sendInviteResent(p: InvitePayload): Promise<void> {
    await this.send({
      to: p.to,
      subject: `Updated invite to ${p.workspaceName} on pinlay`,
      html: inviteResentHtml(p),
      text: inviteResentText(p),
    });
  }

  async sendWelcome(p: WelcomePayload): Promise<void> {
    await this.send({
      to: p.to,
      subject: `Welcome to pinlay — let's drop your first pin`,
      html: welcomeHtml(p),
      text: welcomeText(p),
    });
  }

  private async send(args: SendArgs): Promise<void> {
    const cfg = env();
    if (cfg.mailProvider === "disabled" || !cfg.mailApiKey) {
      // No transport — log enough to be useful in dev. The invite token is
      // already visible in `InviteDto.token` for the admin's Copy invite
      // link menu, so admins aren't blocked.
      this.logger.warn(
        `[mail:disabled] Would send "${args.subject}" to ${args.to}`,
      );
      return;
    }
    try {
      const attachments: ResendAttachment[] = [
        {
          filename: "logo.png",
          content: LOGO_PNG_BASE64,
          content_id: LOGO_CID,
        },
      ];
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.mailApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cfg.mailFrom,
          to: args.to,
          subject: args.subject,
          html: args.html,
          text: args.text,
          attachments,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.logger.warn(
          `Resend failed (${res.status}) for "${args.subject}" → ${args.to}: ${body.slice(0, 200)}`,
        );
        return;
      }
      this.logger.log(`Sent "${args.subject}" → ${args.to}`);
    } catch (err) {
      this.logger.warn(
        `Mail send threw for "${args.subject}" → ${args.to}: ${(err as Error).message}`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates — minimal inline HTML, deliberately no external CSS / images so
// every client renders consistently and we don't risk a CSP-stripped CTA.
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#111827;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
${bodyHtml}
<hr style="border:0;border-top:1px solid #e4e4e7;margin:32px 0 16px;">
<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
You're receiving this because you were invited to a pinlay workspace. If this wasn't expected, you can safely ignore this email.
</p>
</div>
</body>
</html>`;
}

// Brand row used at the top of every template. The pin is the actual
// pinlay brand mark (same path as Brand.vue / favicon.svg) inlined as SVG.
// Inline SVG renders in Apple Mail, iOS Mail, and most native clients;
// Gmail strips it and shows just the "pinlay" wordmark — still clean,
// just iconless. Layout uses a 1×2 table because Gmail strips flexbox.
// Brand row used at the top of every template. The pin uses an embedded
// PNG (the favicon SVG rendered to a 128px PNG, attached with Content-ID
// `pinlay-logo`). CID inline images render in EVERY major mail client —
// Gmail, Apple Mail, iOS Mail, Outlook — unlike inline SVG or data: URIs.
function brandHeader(): string {
  return `
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
  <tr>
    <td style="vertical-align:middle;padding-right:10px;line-height:0;">
      <img src="cid:${LOGO_CID}" width="28" height="28" alt="pinlay" style="display:block;border:0;outline:none;width:28px;height:28px;" />
    </td>
    <td style="vertical-align:middle;">
      <span style="font-weight:700;font-size:18px;letter-spacing:-0.01em;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">pinlay</span>
    </td>
  </tr>
</table>`;
}

function inviteBody(p: InvitePayload, leadIn: string): string {
  return `
${brandHeader()}
<h1 style="font-size:20px;line-height:1.3;margin:0 0 12px;font-weight:600;">
  ${escapeHtml(p.inviterName)} invited you to <span style="color:#7c3aed;">${escapeHtml(p.workspaceName)}</span>
</h1>
<p style="color:#4b5563;line-height:1.6;margin:0 0 24px;">
  ${leadIn} Accept the invite to join the workspace and start pinning feedback together.
</p>
<p style="margin:0 0 24px;">
  <a href="${escapeHtml(p.inviteUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Accept invite</a>
</p>
<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
  Or paste this URL into your browser:<br>
  <a href="${escapeHtml(p.inviteUrl)}" style="color:#7c3aed !important;text-decoration:underline;word-break:break-all;font-family:monospace;font-size:12.5px;">${escapeHtml(p.inviteUrl)}</a>
</p>
<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;">
  This invite expires in 7 days.
</p>`;
}

function inviteHtml(p: InvitePayload): string {
  return shell(
    `You're invited to ${p.workspaceName}`,
    inviteBody(
      p,
      "pinlay lets your team drop comments on a live web app — they stay anchored to the right element across deploys.",
    ),
  );
}

function inviteResentHtml(p: InvitePayload): string {
  return shell(
    `Updated invite to ${p.workspaceName}`,
    inviteBody(
      p,
      "Here's a fresh invite link — the previous one is no longer valid.",
    ),
  );
}

function inviteText(p: InvitePayload): string {
  return `${p.inviterName} invited you to ${p.workspaceName} on pinlay.

pinlay lets your team drop comments on a live web app — they stay anchored to the right element across deploys.

Accept the invite: ${p.inviteUrl}

This invite expires in 7 days. If this wasn't expected, you can safely ignore.`;
}

// Welcome — fires once per real (non-invite) signup. The invite-signup path
// already got their email when they were invited, so we skip those.
function welcomeHtml(p: WelcomePayload): string {
  return shell(
    `Welcome to pinlay`,
    `
${brandHeader()}
<h1 style="font-size:20px;line-height:1.3;margin:0 0 12px;font-weight:600;">
  Welcome to pinlay, ${escapeHtml(p.name)}
</h1>
<p style="color:#4b5563;line-height:1.6;margin:0 0 24px;">
  You're in. <strong>${escapeHtml(p.workspaceName)}</strong> is ready to go. pinlay is anchored comments for your live web app — drop a pin on any element, leave a note, and your team sees it in context.
</p>
<p style="margin:0 0 24px;">
  <a href="${escapeHtml(p.dashboardUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open dashboard</a>
</p>
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 16px;">
  <p style="font-weight:600;font-size:13px;color:#111827;margin:0 0 8px;">Two minutes to your first pin</p>
  <ol style="color:#4b5563;font-size:13px;line-height:1.6;margin:0;padding-left:20px;">
    <li>Install the browser extension from the dashboard.</li>
    <li>Open the popup → <em>Connect to Pinlay</em>.</li>
    <li>Click <em>Drop a pin</em> (or hit <code style="background:#e4e4e7;padding:1px 5px;border-radius:3px;">⌘⇧P</code>) on any page.</li>
  </ol>
</div>
<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;">
  Stuck? Reply to this email — a human reads it.
</p>`,
  );
}
function welcomeText(p: WelcomePayload): string {
  return `Welcome to pinlay, ${p.name}.

${p.workspaceName} is ready to go. pinlay is anchored comments for your live web app — drop a pin on any element, leave a note, and your team sees it in context.

Open the dashboard: ${p.dashboardUrl}

Two minutes to your first pin:
  1. Install the browser extension from the dashboard.
  2. Open the popup → Connect to Pinlay.
  3. Click "Drop a pin" (or ⌘⇧P) on any page.

Stuck? Reply to this email — a human reads it.`;
}

function inviteResentText(p: InvitePayload): string {
  return `${p.inviterName} re-sent your invite to ${p.workspaceName} on pinlay.

The previous link is no longer valid — use the one below:

${p.inviteUrl}

Expires in 7 days.`;
}
