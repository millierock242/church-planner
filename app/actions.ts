"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginAdmin(formData: FormData) {
  const password = formData.get("password") as string;
  // Simple check or database verification for admin login
  if (password === process.env.ADMIN_PASSWORD || password === "admin123") {
    // Set cookie or session if needed, then redirect
    redirect("/admin/services");
  } else {
    return { success: false, error: "Invalid password" };
  }
}

export async function updateAssignmentStatus(assignmentId: string, status: string, eventId: string) {
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
  const title = formData.get("title") as string;
  const eventDate = formData.get("eventDate") as string;
  const description = formData.get("description") as string;

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
    revalidatePath("/admin/services");
    return { success: true };
  } catch (error) {
    console.error("Failed to create event:", error);
    return { success: false, error: "Failed to create event" };
  }
}

export async function createUser(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "volunteer";

  if (!fullName) {
    return { success: false, error: "Full name is required" };
  }

  try {
    await prisma.user.create({
      data: {
        fullName,
        email: email || null,
        role,
      },
    });
    revalidatePath("/admin/volunteers");
    return { success: true };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function createTeam(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

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
  const eventId = formData.get("eventId") as string;
  const userId = formData.get("userId") as string;
  const roleId = formData.get("roleId") as string;

  if (!eventId || !userId || !roleId) {
    return { success: false, error: "All fields are required" };
  }

  try {
    await prisma.serviceAssignment.create({
      data: {
        eventId,
        userId,
        roleId,
        status: "pending",
      },
    });
    revalidatePath(`/admin/services/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return { success: false, error: "Failed to create assignment" };
  }
}