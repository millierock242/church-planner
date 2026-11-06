import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export interface Access {
  isAdmin: boolean;
  leaderTeamId: string | null;
  isStaff: boolean;
}

export async function getAccess(): Promise<Access> {
  const session = await getSession();
  const isAdmin = !!session.isAdmin;
  const leaderTeamId = session.leaderTeamId ?? null;
  return { isAdmin, leaderTeamId, isStaff: isAdmin || !!leaderTeamId };
}

// For actions only the main admin may do.
export async function requireAdmin(): Promise<Access> {
  const access = await getAccess();
  if (!access.isAdmin) redirect("/login");
  return access;
}

// For actions that admins and ministry leaders may both do.
export async function requireStaff(): Promise<Access> {
  const access = await getAccess();
  if (!access.isStaff) redirect("/login");
  return access;
}

// For pages only the main admin may see (leaders are sent to their To-Do page).
export async function requireAdminPage(): Promise<Access> {
  const access = await getAccess();
  if (!access.isStaff) redirect("/login");
  if (!access.isAdmin) redirect("/admin/todo");
  return access;
}

// Can this person manage things in the given ministry?
export function canManageTeam(access: Access, teamId: string): boolean {
  return access.isAdmin || access.leaderTeamId === teamId;
}
