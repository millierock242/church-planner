import { redirect } from "next/navigation";

// The old public volunteer list exposed email addresses.
// It now points to the password-protected admin version.
export default function VolunteersPage() {
  redirect("/admin/volunteers");
}
