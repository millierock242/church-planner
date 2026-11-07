import { redirect } from "next/navigation";

// The volunteer portal now lives on the home page. This keeps old links working.
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  redirect(name ? `/?name=${encodeURIComponent(name)}#my-schedule` : "/#my-schedule");
}
