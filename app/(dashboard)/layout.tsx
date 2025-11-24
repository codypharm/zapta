/**
 * Dashboard Layout
 * Layout for authenticated pages with sidebar navigation
 * Handles auth checking and redirects if not logged in
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/dashboard/layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login");
  }

  // Get user profile for display
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const userData = {
    name: profile?.full_name || user.email?.split("@")[0] || "User",
    email: profile?.email || user.email || "",
  };

  return <DashboardLayoutClient user={userData}>{children}</DashboardLayoutClient>;
}
