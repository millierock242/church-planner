"use server";

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireAdmin, requireStaff, canManageTeam } from "@/lib/auth";
import { hashPassword, verifyPassword, newToken } from "@/lib/password";
import { findConflicts } from "@/lib/conflicts";
import { sendVolunteerEmail, sendAdminNotice } from "@/lib/notifications";
import { normalizeName } from "@/lib/dates";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || !passwordMatches(password, expected)) {
    redirect("/login?error=1");
  }

  const session = await getSession();
  session.isAdmin = true;
  session.leaderTeamId = undefined;
  await session.save();
  redirect("/admin/services");
}

export async function loginLeader(formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "");
  const password = String(formData.get("password") ?? "");

  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId } }) : null;
  if (!team || !verifyPassword(password, team.leaderPasswordHash)) {
    redirect("/login?error=leader");
  }

  const session = await getSession();
  session.isAdmin = false;
  session.leaderTeamId = team.id;
  await session.save();
  redirect("/admin/todo");
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
  const repeatWeeks = Math.min(52, Math.max(1, parseInt(String(formData.get("repeatWeeks") ?? "1"), 10) || 1));

  if (!title || !eventDate) {
    return { success: false, error: "Title and eventDate are required" };
  }

  try {
    const first = new Date(eventDate);
    for (let i = 0; i < repeatWeeks; i++) {
      const date = new Date(first);
      date.setDate(first.getDate() + 7 * i);
      await prisma.event.create({
        data: { title, eventDate: date, description: description || null },
      });
    }
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event" };
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
  redirect("/admin/services");
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
  const access = await requireStaff();
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const override = String(formData.get("override") ?? "") === "1";
  const back = `/admin/services/${eventId}`;

  if (!eventId || !userId || !roleId) redirect(`${back}?notice=missing`);

  const [event, role, person] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.teamRole.findUnique({ where: { id: roleId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!event || !role || !person) redirect(`${back}?notice=error`);
  if (!canManageTeam(access, role.teamId)) redirect(`${back}?notice=forbidden`);
  if (!person.isApproved) redirect(`${back}?notice=unapproved`);

  if (!override) {
    const reasons = await findConflicts(userId, event, roleId);
    if (reasons.length > 0) {
      const qs = new URLSearchParams({ conflict: reasons.join("; "), userId, roleId });
      redirect(`${back}?${qs.toString()}`);
    }
  }

  try {
    await prisma.serviceAssignment.create({
      data: { eventId, userId, roleId, status: "pending" },
    });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    redirect(`${back}?notice=error`);
  }
  revalidatePath(back);
  revalidatePath("/admin/todo");

  // Email the volunteer. A failed email must never undo the assignment.
  try {
    await sendVolunteerEmail({
      toEmail: person.email,
      volunteerName: person.fullName,
      eventTitle: event.title,
      eventDate: event.eventDate,
      roleName: role.name,
      accessToken: person.accessToken,
    });
  } catch (emailError) {
    console.error("Assignment saved but email failed:", emailError);
  }
  redirect(`${back}?notice=assigned`);
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
  const access = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  try {
    const a = await prisma.serviceAssignment.findUnique({ where: { id }, include: { role: true } });
    if (a && canManageTeam(access, a.role.teamId)) {
      await prisma.serviceAssignment.delete({ where: { id } });
    }
  } catch (error) {
    console.error("Failed to delete assignment:", error);
  }
  revalidatePath(`/admin/services/${eventId}`);
  revalidatePath("/admin/roster");
  revalidatePath("/admin/todo");
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
      data: { fullName, email, role: "volunteer", isApproved: false, accessToken: newToken() },
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
      data: { fullName, email: email || null, role: "volunteer", accessToken: newToken() },
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

export async function approveVolunteer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.user.update({ where: { id }, data: { isApproved: true } });
  } catch (error) {
    console.error("Failed to approve volunteer:", error);
  }
  revalidatePath("/admin/volunteers");
  revalidatePath("/admin/services");
  redirect("/admin/volunteers?added=approved");
}

// ---------- Volunteer self-service (private link) ----------

async function volunteerByToken(token: string) {
  if (!token) return null;
  return prisma.user.findUnique({ where: { accessToken: token } });
}

export async function setStatusByToken(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "confirmed" && status !== "declined") redirect(`/my/${token}`);

  const user = await volunteerByToken(token);
  if (user) {
    const a = await prisma.serviceAssignment.findUnique({ where: { id: assignmentId } });
    if (a && a.userId === user.id) {
      await prisma.serviceAssignment.update({ where: { id: a.id }, data: { status, swapNote: null } });
      revalidatePath(`/admin/services/${a.eventId}`);
      revalidatePath("/admin/todo");
    }
  }
  redirect(`/my/${token}`);
}

async function markSwap(assignmentId: string, userId: string, note: string) {
  const a = await prisma.serviceAssignment.findUnique({
    where: { id: assignmentId },
    include: { event: true, role: true, user: true },
  });
  if (!a || a.userId !== userId) return false;
  await prisma.serviceAssignment.update({
    where: { id: a.id },
    data: { status: "swap_requested", swapNote: note || null },
  });
  revalidatePath(`/admin/services/${a.eventId}`);
  revalidatePath("/admin/todo");
  try {
    await sendAdminNotice(
      `Swap request: ${a.user.fullName} for ${a.event.title}`,
      `${a.user.fullName} can't serve as ${a.role.name} at "${a.event.title}" and asked for a replacement.${note ? ` Note: ${note}` : ""}`
    );
  } catch (error) {
    console.error("Swap saved but admin email failed:", error);
  }
  return true;
}

export async function requestSwapByToken(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const user = await volunteerByToken(token);
  if (user) await markSwap(assignmentId, user.id, note);
  redirect(`/my/${token}`);
}

// Used by the name-based portal.
export async function requestSwapByName(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const a = await prisma.serviceAssignment.findUnique({ where: { id: assignmentId }, include: { user: true } });
  if (a && normalizeName(a.user.fullName) === normalizeName(name)) {
    await markSwap(assignmentId, a.userId, note);
  }
  redirect(`/portal?name=${encodeURIComponent(name)}`);
}

export async function addBlockoutByToken(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const user = await volunteerByToken(token);
  if (user && dateStr) {
    const date = new Date(`${dateStr}T00:00`);
    if (!isNaN(date.getTime())) {
      const exists = await prisma.blockoutDate.findFirst({ where: { userId: user.id, date } });
      if (!exists) await prisma.blockoutDate.create({ data: { userId: user.id, date, note: note || null } });
    }
  }
  redirect(`/my/${token}`);
}

export async function removeBlockoutByToken(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const id = String(formData.get("id") ?? "");
  const user = await volunteerByToken(token);
  if (user) await prisma.blockoutDate.deleteMany({ where: { id, userId: user.id } });
  redirect(`/my/${token}`);
}

// ---------- Swaps, copy roster, ministry settings (staff) ----------

export async function reassignAssignment(formData: FormData) {
  const access = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const newUserId = String(formData.get("newUserId") ?? "");
  if (!id || !newUserId) redirect("/admin/todo");

  const a = await prisma.serviceAssignment.findUnique({
    where: { id },
    include: { event: true, role: true },
  });
  const person = await prisma.user.findUnique({ where: { id: newUserId } });
  if (a && person && person.isApproved && canManageTeam(access, a.role.teamId)) {
    await prisma.serviceAssignment.update({
      where: { id },
      data: { userId: newUserId, status: "pending", swapNote: null, reminder1dSentAt: null, reminder3dSentAt: null },
    });
    try {
      await sendVolunteerEmail({
        toEmail: person.email,
        volunteerName: person.fullName,
        eventTitle: a.event.title,
        eventDate: a.event.eventDate,
        roleName: a.role.name,
        accessToken: person.accessToken,
      });
    } catch (error) {
      console.error("Reassigned but email failed:", error);
    }
    revalidatePath(`/admin/services/${a.eventId}`);
  }
  revalidatePath("/admin/todo");
  redirect("/admin/todo");
}

export async function keepAssignment(formData: FormData) {
  const access = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const a = await prisma.serviceAssignment.findUnique({ where: { id }, include: { role: true } });
  if (a && canManageTeam(access, a.role.teamId)) {
    await prisma.serviceAssignment.update({ where: { id }, data: { status: "pending", swapNote: null } });
  }
  revalidatePath("/admin/todo");
  redirect("/admin/todo");
}

export async function copyRoster(formData: FormData) {
  const access = await requireStaff();
  const fromEventId = String(formData.get("fromEventId") ?? "");
  const toEventId = String(formData.get("toEventId") ?? "");
  const notify = String(formData.get("notify") ?? "") === "1";
  const back = `/admin/services/${toEventId}`;

  if (!fromEventId || !toEventId || fromEventId === toEventId) redirect(`${back}?notice=copyerror`);

  const [toEvent, source, existing] = await Promise.all([
    prisma.event.findUnique({ where: { id: toEventId } }),
    prisma.serviceAssignment.findMany({
      where: { eventId: fromEventId },
      include: { role: true, user: true },
    }),
    prisma.serviceAssignment.findMany({ where: { eventId: toEventId } }),
  ]);
  if (!toEvent) redirect(`${back}?notice=copyerror`);

  let copied = 0;
  let skipped = 0;
  for (const a of source) {
    if (!canManageTeam(access, a.role.teamId) || !a.user.isApproved) { skipped++; continue; }
    if (existing.some((e) => e.userId === a.userId && e.roleId === a.roleId)) { skipped++; continue; }
    const reasons = await findConflicts(a.userId, toEvent, a.roleId);
    if (reasons.length > 0) { skipped++; continue; }

    await prisma.serviceAssignment.create({
      data: { eventId: toEventId, userId: a.userId, roleId: a.roleId, status: "pending" },
    });
    copied++;
    if (notify) {
      try {
        await sendVolunteerEmail({
          toEmail: a.user.email,
          volunteerName: a.user.fullName,
          eventTitle: toEvent.title,
          eventDate: toEvent.eventDate,
          roleName: a.role.name,
          accessToken: a.user.accessToken,
        });
      } catch (error) {
        console.error("Copied but email failed:", error);
      }
    }
  }
  revalidatePath(back);
  revalidatePath("/admin/todo");
  redirect(`${back}?notice=copied&copied=${copied}&skipped=${skipped}`);
}

export async function setLeaderPassword(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!teamId) redirect("/admin/teams");
  if (password.length > 0 && password.length < 6) redirect("/admin/teams?leader=short");
  await prisma.team.update({
    where: { id: teamId },
    data: { leaderPasswordHash: password ? hashPassword(password) : null },
  });
  revalidatePath("/admin/teams");
  redirect(`/admin/teams?leader=${password ? "saved" : "cleared"}`);
}

export async function toggleRoleRequired(formData: FormData) {
  await requireAdmin();
  const roleId = String(formData.get("roleId") ?? "");
  const role = await prisma.teamRole.findUnique({ where: { id: roleId } });
  if (role) {
    await prisma.teamRole.update({ where: { id: roleId }, data: { requiredByDefault: !role.requiredByDefault } });
  }
  revalidatePath("/admin/teams");
  revalidatePath("/admin/todo");
  redirect("/admin/teams");
}
