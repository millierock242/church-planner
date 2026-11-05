"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, SessionData } from "@/lib/session";
import { sendRealNotification } from "@/lib/notifications";

// Simple in-memory rate limiter store (IP / identifier -> { attempts, resetTime })
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export async function loginAdmin(formData: FormData) {
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "on";
  const adminPassword = process.env.ADMIN_PASSWORD || "Only4Christ";

  // Rate Limiting check (Max 5 attempts per 15 minutes)
  const clientKey = "admin_login_ip"; // In production, extract real client IP from headers
  const now = Date.now();
  const record = loginAttempts.get(clientKey);

  if (record && record.resetTime > now) {
    if (record.count >= 5) {
      const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
      redirect(`/login?error=Too+many+failed+attempts.+Please+try+again+in+${remainingMinutes}+minutes.`);
    }
  } else {
    loginAttempts.set(clientKey, { count: 0, resetTime: now + 15 * 60 * 1000 });
  }

  if (password === adminPassword) {
    // Reset rate limiter on success
    loginAttempts.delete(clientKey);

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.isAdmin = true;

    // Configure persistent cookie if Remember Me is checked (30 days vs session-only)
    if (rememberMe) {
      sessionOptions.cookieOptions = {
        ...sessionOptions.cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      };
    } else {
      sessionOptions.cookieOptions = {
        ...sessionOptions.cookieOptions,
        maxAge: undefined, // Session cookie
      };
    }

    await session.save();
    redirect("/admin/services");
  } else {
    // Increment failure count
    const currentRecord = loginAttempts.get(clientKey) || { count: 0, resetTime: now + 15 * 60 * 1000 };
    currentRecord.count += 1;
    loginAttempts.set(clientKey, currentRecord);

    const attemptsLeft = Math.max(0, 5 - currentRecord.count);
    redirect(`/login?error=Invalid+Password.+Attempts+remaining:+${attemptsLeft}`);
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
  redirect("/login");
}

export async function updateAssignmentStatus(assignmentId: string, status: string, eventId: string) {
  try {
    await prisma.serviceAssignment.update({
      where: { id: assignmentId },
      data: { status },
    });
  } catch (error) {
    console.error("Failed to update status:", error);
  }
  revalidatePath("/portal");
  revalidatePath(`/admin/services/${eventId}`);
}

export async function notifyVolunteer(assignmentId: string) {
  try {
    const assignment = await prisma.serviceAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true, event: true, role: true },
    });

    if (!assignment) return;

    await sendRealNotification({
      toEmail: assignment.user.email,
      volunteerName: assignment.user.fullName,
      eventTitle: assignment.event.title,
      eventDate: assignment.event.eventDate,
      roleName: assignment.role.name,
    });
  } catch (error) {
    console.error("Failed to trigger notification:", error);
  }
}

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const eventDate = formData.get("eventDate") as string;
  const callTime = formData.get("callTime") as string;
  const description = formData.get("description") as string;

  if (!title || !eventDate) return;

  try {
    await prisma.event.create({
      data: {
        title,
        eventDate: new Date(eventDate),
        callTime: callTime ? new Date(callTime) : new Date(eventDate),
        description,
      },
    });
  } catch (error) {
    console.error("Failed to create event:", error);
  }

  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function createVolunteer(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phoneNumber = formData.get("phone") as string;

  if (!fullName) return;

  try {
    await prisma.user.create({
      data: {
        fullName,
        email: email || "",
        phoneNumber: phoneNumber || null,
        isApproved: false,
      },
    });
  } catch (error) {
    console.error("Failed to create volunteer:", error);
  }

  revalidatePath("/join");
  revalidatePath("/admin/volunteers");
}

export async function toggleVolunteerApproval(userId: string, currentStatus: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isApproved: !currentStatus },
    });
  } catch (error) {
    console.error("Failed to toggle approval:", error);
  }

  revalidatePath("/admin/volunteers");
}

export async function createTeam(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) return;

  try {
    await prisma.team.create({
      data: {
        name,
        description: description || null,
      },
    });
  } catch (error) {
    console.error("Failed to create team:", error);
  }

  revalidatePath("/admin/teams");
}

export async function createTeamRole(formData: FormData) {
  const name = formData.get("name") as string;
  const teamId = formData.get("teamId") as string;

  if (!name || !teamId) return;

  try {
    await prisma.teamRole.create({
      data: {
        name,
        teamId,
      },
    });
  } catch (error) {
    console.error("Failed to create team role:", error);
  }

  revalidatePath("/admin/teams");
}

export async function assignVolunteerToService(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const userId = formData.get("userId") as string;
  const roleId = formData.get("roleId") as string;

  if (!eventId || !userId || !roleId) {
    console.log("Missing form data for assignment:", { eventId, userId, roleId });
    return;
  }

  try {
    const assignment = await prisma.serviceAssignment.create({
      data: {
        eventId,
        userId,
        roleId,
        status: "pending",
      },
    });

    await notifyVolunteer(assignment.id);
  } catch (error) {
    console.error("Failed to create service assignment:", error);
  }

  revalidatePath(`/admin/services/${eventId}`);
  revalidatePath("/");
}export async function updateVolunteerStatus(userId: string, isApproved: boolean) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isApproved },
    });
  } catch (error) {
    console.error("Failed to update volunteer status:", error);
  }
  revalidatePath("/admin/volunteers");
}

export async function deleteVolunteer(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    console.error("Failed to delete volunteer:", error);
  }
  revalidatePath("/admin/volunteers");
}