import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth";

// Second line of defence: even if the proxy is bypassed, every /admin page
// checks the login before rendering. Admins and ministry leaders may enter;
// pages that are admin-only check again themselves.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  if (!access.isStaff) redirect("/login");
  return <>{children}</>;
}
