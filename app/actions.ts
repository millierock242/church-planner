"use server";

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/session";
import { sendVolunteerEmail } from "@/lib/notifications";
import { normalizeName } from "@/lib/dates";
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

// Public on purpose, but a volunteer can only change an assignment that
// belongs to the name they looked up.
export async function updateMyAssignmentStatus(assignmentId: string, status: string, name: string) {
  if (status !== "confirmed" && status !== "declined") {
    return { success: false, error: "Invalid status" };
  }
  const cleanName = normalizeName(name);
  if (!cleanName) return { success: false, error: "Name required" };

  try {
    const assignment = await prisma.serviceAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true },
    });
    if (!assignment || normalizeName(assignment.user.fullName) !== cleanName) {
      return { success: false, error: "Assignment not found" };
    }
    await prisma.serviceAssignment.update({
      where: { id: assignmentId },
      data: { status },
    });
    revalidatePath(`/admin/services/${assignment.eventId}`);
    revalidatePath("/admin/roster");
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

  if (!name) return { success: false, error: "Ministry name is required" };

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
    return { success: false, error: "Failed to create ministry" };
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

// ---------- Edit & delete (admin only) ----------

export async function updateEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !title || !eventDate) redirect(`/admin/services/${id}/edit?error=1`);

  try {
    await prisma.event.update({
      where: { id },
      data: { title, eventDate: new Date(eventDate), description: description || null },
    });
  } catch (error) {
    console.error("Failed to update event:", error);
    redirect(`/admin/services/${id}/edit?error=1`);
  }
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/roster");
  revalidatePath("/");
  redirect(`/admin/services/${id}`);
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.event.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete event:", error);
  }
  revalidatePath("/admin/services");
  revalidatePath("/admin/roster");
  revalidatePath("/");
  redirect("/admin/services");
}

export async function updateVolunteer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!id || !fullName) redirect(`/admin/volunteers/${id}/edit?error=1`);

  try {
    await prisma.user.update({
      where: { id },
      data: { fullName, email: email || null },
    });
  } catch (error) {
    console.error("Failed to update volunteer:", error);
    redirect(`/admin/volunteers/${id}/edit?error=1`);
  }
  revalidatePath("/admin/volunteers");
  revalidatePath("/admin/roster");
  redirect("/admin/volunteers");
}

export async function deleteVolunteer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.user.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete volunteer:", error);
  }
  revalidatePath("/admin/volunteers");
  revalidatePath("/admin/roster");
  redirect("/admin/volunteers");
}

export async function deleteAssignment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  try {
    await prisma.serviceAssignment.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
  }
  revalidatePath(`/admin/services/${eventId}`);
  revalidatePath("/admin/roster");
  redirect(`/admin/services/${eventId}`);
}

// ---------- Volunteer sign-up (public) and add volunteer (admin) ----------

// Public sign-up form on the home page. Always creates a plain volunteer.
export async function signUpVolunteer(formData: FormData) {
  // Hidden "website" field: real people leave it empty, spam bots fill it in.
  if (String(formData.get("website") ?? "")) redirect("/?signup=success#signup");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName || !email) redirect("/?signup=missing#signup");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/?signup=exists#signup");

  try {
    await prisma.user.create({
      data: { fullName, email, role: "volunteer" },
    });
  } catch (error) {
    console.error("Failed to sign up volunteer:", error);
    redirect("/?signup=error#signup");
  }
  revalidatePath("/admin/volunteers");
  redirect("/?signup=success#signup");
}

export async function addVolunteer(formData: FormData) {
  await requireAdmin();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName) redirect("/admin/volunteers?added=missing");

  try {
    await prisma.user.create({
      data: { fullName, email: email || null, role: "volunteer" },
    });
  } catch (error) {
    console.error("Failed to add volunteer:", error);
    redirect("/admin/volunteers?added=error");
  }
  revalidatePath("/admin/volunteers");
  redirect("/admin/volunteers?added=ok");
}

// ---------- Roles (admin) ----------

export async function addRole(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!teamId || !name) redirect("/admin/teams?role=missing");

  try {
    const existing = await prisma.teamRole.findMany({ where: { teamId } });
    if (existing.some((r) => r.name.trim().toLowerCase() === name.toLowerCase())) {
      redirect("/admin/teams?role=exists");
    }
    await prisma.teamRole.create({ data: { name, teamId } });
  } catch (error) {
    // redirect() works by throwing: let it through
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to add role:", error);
    redirect("/admin/teams?role=error");
  }
  revalidatePath("/admin/teams");
  revalidatePath("/admin/services");
  redirect("/admin/teams?role=ok");
}
