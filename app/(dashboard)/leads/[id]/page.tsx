/**
 * Lead Detail Page
 * View and edit lead information
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadDetail } from "@/components/leads/lead-detail";
import { getLeadById } from "@/lib/leads/actions";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch lead
  const result = await getLeadById(id);

  if (result.error || !result.lead) {
    redirect("/leads");
  }

  return <LeadDetail lead={result.lead} />;
}
