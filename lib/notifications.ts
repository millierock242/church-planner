import { Resend } from "resend";
import * as ics from "ics";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const senderEmail = process.env.SENDER_EMAIL || "Church Scheduler <onboarding@resend.dev>";

interface EmailPayload {
  toEmail?: string | null;
  volunteerName: string;
  eventTitle: string;
  eventDate: Date;
  callTime?: Date | null;
  roleName: string;
}

// Generate .ics calendar attachment Buffer
async function generateIcsBuffer(
  eventTitle: string,
  roleName: string,
  eventDate: Date,
  callTime?: Date | null
): Promise<Buffer | null> {
  const startDate = callTime ? new Date(callTime) : new Date(eventDate);
  
  return new Promise((resolve) => {
    ics.createEvent(
      {
        title: `${eventTitle} - ${roleName}`,
        description: `Scheduled as ${roleName} for ${eventTitle}. Please log in to confirm your status.`,
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

export async function sendVolunteerEmail({
  toEmail,
  volunteerName,
  eventTitle,
  eventDate,
  callTime,
  roleName,
}: EmailPayload) {
  if (!toEmail) {
    console.warn(`[EMAIL SKIPPED] No email address for ${volunteerName}`);
    return;
  }

  const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedCallTime = callTime
    ? new Date(callTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "Standard Service Call Time";

  const appPortalUrl = "http://localhost:3000/portal";

  // Generate .ics attachment
  const icsBuffer = await generateIcsBuffer(eventTitle, roleName, eventDate, callTime);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">⛪ Service Assignment</h1>
      </div>
      <div style="padding: 24px; color: #1f2937; line-height: 1.5;">
        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${volunteerName}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563;">You have been scheduled for an upcoming service. A calendar event (<strong>.ics</strong>) is attached to this email so you can add it directly to your calendar.</p>
        
        <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600; width: 100px;">Event:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #111827;">${eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Role:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #4f46e5;">${roleName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #374151;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Call Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #374151;">${formattedCallTime}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 28px; margin-bottom: 12px;">
          <a href="${appPortalUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            Confirm or Decline Availability →
          </a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
        Sent via Church Scheduler • Open attachment to save to Apple, Google, or Outlook Calendar.
      </div>
    </div>
  `;

  if (resend) {
    try {
      const attachments = icsBuffer
        ? [
            {
              filename: `service-assignment.ics`,
              content: icsBuffer,
            },
          ]
        : [];

      const response = await resend.emails.send({
        from: senderEmail,
        to: toEmail,
        subject: `Service Assignment: ${eventTitle} (${roleName})`,
        html: htmlContent,
        attachments,
      });

      if (response.error) {
        console.error(`[RESEND ERROR]:`, response.error);
      } else {
        console.log(`[RESEND SUCCESS] Delivered email with .ics calendar invite to ${toEmail}`);
      }
    } catch (error) {
      console.error("[RESEND EXCEPTION]:", error);
    }
  } else {
    console.log(`[RESEND SKIPPED] RESEND_API_KEY missing in .env`);
  }
}

// Alias for backward compatibility with previous server action imports
export const sendRealNotification = sendVolunteerEmail;