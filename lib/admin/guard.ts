import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Every admin page and action calls this first. Signed-out visitors
 * go to sign-in; signed-in non-admins go back to the homepage. RLS
 * on the database enforces the same rule independently, so even if
 * this check were skipped, a non-admin would just see empty data.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/");

  return { supabase, user };
}
