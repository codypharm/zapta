/**
 * Settings Page
 * User and organization settings management
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";
import { getSettings } from "@/lib/settings/actions";

export default async function SettingsPage() {
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch settings
  const result = await getSettings();

  if (result.error) {
    redirect("/dashboard");
  }

  return (
    <SettingsClient
      profile={result.profile!}
      organization={result.organization!}
    />
  );
}
