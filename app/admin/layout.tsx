import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";

// Second line of defence: even if the proxy is bypassed, every /admin page
// checks the login before rendering.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/login");
  return <>{children}</>;
}
