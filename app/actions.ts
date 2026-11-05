"use server";

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/session";
import { sendVolunteerEmail } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || !passwordMatches(password, expected)) {
    redirect("/login?error=1");
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  redirect("/admin/services");
}

export async function logoutAdmin() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

// Public on purpose: volunteers use this from the portal.
export async function updateAssignmentStatus(assignmentId: string, status: string, eventId: string) {
  if (status !== "confirmed" && status !== "declined") {
    return { success: false, error: "Invalid status" };
  }
  try {
    await prisma.serviceAssignment.update({
      where: { id: assignmentId },
      data: { status },
    });
    revalidatePath(`/admin/services/${eventId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    console.error("Failed to update status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function createEvent(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !eventDate) {
    return { success: false, error: "Title and eventDate are required" };
  }

  try {
    await prisma.event.create({
      data: {
        title,
        eventDate: new Date(eventDate),
        description: description || null,
      },
    });
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event" };
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
  redirect("/admin/services");
}

// Public on purpose: this is the volunteer sign-up form. The role is always
// "volunteer" so nobody can sign themselves up with a different role.
export async function createUser(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName) {
    return { success: false, error: "Full name is required" };
  }

  try {
    await prisma.user.create({
      data: {
        fullName,
        email: email || null,
        role: "volunteer",
      },
    });
    revalidatePath("/admin/volunteers");
    return { success: true };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create user (is that email already registered?)" };
  }
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { success: false, error: "Team name is required" };

  try {
    await prisma.team.create({
      data: {
        name,
        description: description || null,
      },
    });
    revalidatePath("/admin/teams");
    return { success: true };
  } catch (error) {
    console.error("Failed to create team:", error);
    return { success: false, error: "Failed to create team" };
  }
}

export async function createAssignment(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  if (!eventId || !userId || !roleId) {
    return { success: false, error: "All fields are required" };
  }

  try {
    const assignment = await prisma.serviceAssignment.create({
      data: { eventId, userId, roleId, status: "pending" },
      include: { event: true, user: true, role: true },
    });
    revalidatePath(`/admin/services/${eventId}`);

    // Email the volunteer. A failed email must never undo the assignment.
    try {
      await sendVolunteerEmail({
        toEmail: assignment.user.email,
        volunteerName: assignment.user.fullName,
        eventTitle: assignment.event.title,
        eventDate: assignment.event.eventDate,
        roleName: assignment.role.name,
      });
    } catch (emailError) {
      console.error("Assignment saved but email failed:", emailError);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return { success: false, error: "Failed to create assignment" };
  }
}
