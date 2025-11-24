/**
 * Landing Page - Server Component Wrapper
 * Handles auth check and passes to client component
 */

import { createServerClient } from "@/lib/supabase/server";
import { LandingPageClient } from "./landing-page-client";

export default async function HomePage() {
  // Check if user is authenticated (server-side)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPageClient isAuthenticated={!!user} />;
}
