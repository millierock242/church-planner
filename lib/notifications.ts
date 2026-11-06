import { Resend } from "resend";
import * as ics from "ics";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SITE_NAME = "Christ Community Church’s Planner";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Splits "Name <me@example.com>" into its two parts.
function parseSender(value: string): { name: string; email: string } {
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, "") || SITE_NAME, email: m[2] };
  return { name: SITE_NAME, email: value.trim() };
}

const senderEmail = process.env.SENDER_EMAIL || `${SITE_NAME} <onboarding@resend.dev>`;

export function siteUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Low-level sender: Brevo (free, works on Railway) first, then Resend.
// ---------------------------------------------------------------------------
async function deliver(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  icsBuffer?: Buffer | null;
}) {
  const { toEmail, toName, subject, html, icsBuffer } = opts;

  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const from = parseSender(senderEmail);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: from.name, email: from.email },
          to: [{ email: toEmail, name: toName }],
          subject,
          htmlContent: html,
          ...(icsBuffer
            ? { attachment: [{ name: "service-invite.ics", content: icsBuffer.toString("base64") }] }
            : {}),
        }),
      });
      if (!response.ok) {
        console.error("[BREVO ERROR]:", response.status, await response.text());
      } else {
        console.log(`[BREVO SUCCESS] Delivered "${subject}" to ${toEmail}`);
      }
    } catch (error) {
      console.error("[BREVO EXCEPTION]:", error);
    }
    return;
  }

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: senderEmail,
        to: toEmail,
        subject,
        html,
        attachments: icsBuffer ? [{ filename: "service-invite.ics", content: icsBuffer }] : [],
      });
      if (response.error) console.error("[RESEND ERROR]:", response.error);
      else console.log(`[RESEND SUCCESS] Delivered "${subject}" to ${toEmail}`);
    } catch (error) {
      console.error("[RESEND EXCEPTION]:", error);
    }
    return;
  }

  console.log("[EMAIL SKIPPED] Neither BREVO_API_KEY nor RESEND_API_KEY is set");
}

// ---------------------------------------------------------------------------
// Calendar invite for one assignment.
// ---------------------------------------------------------------------------
async function generateIcsBuffer(
  eventTitle: string,
  roleName: string,
  eventDate: Date,
  attendee?: { name: string; email: string }
): Promise<Buffer | null> {
  const organizer = parseSender(senderEmail);
  const startDate = new Date(eventDate);

  return new Promise((resolve) => {
    ics.createEvent(
      {
        title: `${eventTitle} - ${roleName}`,
        description: `Scheduled as ${roleName} for ${eventTitle}.`,
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        duration: { hours: 2, minutes: 0 },
        status: "CONFIRMED",
        busyStatus: "BUSY",
        method: "REQUEST",
        organizer: { name: organizer.name, email: organizer.email },
        ...(attendee ? { attendees: [{ name: attendee.name, email: attendee.email, rsvp: true }] } : {}),
      },
      (error, value) => {
        if (error || !value) {
          console.error("Failed to generate ICS file:", error);
          resolve(null);
        } else {
          resolve(Buffer.from(value));
        }
      }
    );
  });
}

function frame(heading: string, inner: string, buttonUrl: string, buttonText: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #3b7d0b; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">${heading}</h1>
      </div>
      <div style="padding: 24px; color: #1f2937; line-height: 1.5;">
        ${inner}
        <div style="text-align: center; margin-top: 28px; margin-bottom: 12px;">
          <a href="${buttonUrl}" style="background-color: #3b7d0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            ${buttonText}
          </a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
        Sent via ${SITE_NAME}
      </div>
    </div>`;
}

function detailsTable(eventTitle: string, roleName: string, eventDate: Date) {
  const when = new Date(eventDate).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `
    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #6b7280; font-weight: 600; width: 90px;">Event:</td><td style="padding: 6px 0; font-weight: 700; color: #111827;">${esc(eventTitle)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Role:</td><td style="padding: 6px 0; font-weight: 700; color: #3b7d0b;">${esc(roleName)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-weight: 600;">When:</td><td style="padding: 6px 0; font-weight: 600; color: #374151;">${esc(when)}</td></tr>
      </table>
    </div>`;
}

function personalLink(accessToken?: string | null) {
  return accessToken ? `${siteUrl()}/my/${accessToken}` : `${siteUrl()}/portal`;
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------
export interface AssignmentEmail {
  toEmail?: string | null;
  volunteerName: string;
  eventTitle: string;
  eventDate: Date;
  roleName: string;
  accessToken?: string | null;
}

export async function sendVolunteerEmail(p: AssignmentEmail) {
  if (!p.toEmail) {
    console.warn(`[EMAIL SKIPPED] No email address for ${p.volunteerName}`);
    return;
  }
  const icsBuffer = await generateIcsBuffer(p.eventTitle, p.roleName, p.eventDate, {
    name: p.volunteerName,
    email: p.toEmail,
  });
  const html = frame(
    "⛪ Service Assignment",
    `<p style="font-size: 16px; margin-top: 0;">Hi <strong>${esc(p.volunteerName)}</strong>,</p>
     <p style="font-size: 14px; color: #4b5563;">You have been scheduled for an upcoming service. A calendar invite is attached so you can add it to your calendar.</p>
     ${detailsTable(p.eventTitle, p.roleName, p.eventDate)}`,
    personalLink(p.accessToken),
    "Confirm or Decline →"
  );
  await deliver({
    toEmail: p.toEmail,
    toName: p.volunteerName,
    subject: `Service Assignment: ${p.eventTitle} (${p.roleName})`,
    html,
    icsBuffer,
  });
}

export async function sendReminderEmail(
  p: AssignmentEmail & { kind: "confirm" | "tomorrow" }
) {
  if (!p.toEmail) return;
  const intro =
    p.kind === "tomorrow"
      ? "A friendly reminder that you are serving <strong>soon</strong>. Thank you for being part of the team!"
      : "You haven’t confirmed this assignment yet. Please let us know if you can make it.";
  const html = frame(
    p.kind === "tomorrow" ? "⏰ Service Reminder" : "🙋 Please Confirm",
    `<p style="font-size: 16px; margin-top: 0;">Hi <strong>${esc(p.volunteerName)}</strong>,</p>
     <p style="font-size: 14px; color: #4b5563;">${intro}</p>
     ${detailsTable(p.eventTitle, p.roleName, p.eventDate)}`,
    personalLink(p.accessToken),
    p.kind === "tomorrow" ? "View My Schedule →" : "Confirm or Decline →"
  );
  await deliver({
    toEmail: p.toEmail,
    toName: p.volunteerName,
    subject:
      p.kind === "tomorrow"
        ? `Reminder: ${p.eventTitle} (${p.roleName})`
        : `Please confirm: ${p.eventTitle} (${p.roleName})`,
    html,
  });
}

// A short note to the church admin (for example, when someone asks for a swap).
export async function sendAdminNotice(subject: string, message: string, linkPath = "/admin/todo") {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const html = frame(
    "📣 Heads up",
    `<p style="font-size: 14px; color: #374151;">${esc(message)}</p>`,
    `${siteUrl()}${linkPath}`,
    "Open the Planner →"
  );
  await deliver({ toEmail: to, toName: "Church Admin", subject, html });
}

// Alias for backward compatibility with previous imports
export const sendRealNotification = sendVolunteerEmail;
