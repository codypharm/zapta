/**
 * Conversation Detail Page
 * View full conversation thread
 */

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationDetail } from "@/components/conversations/conversation-detail";
import { getConversationById } from "@/lib/conversations/actions";

export default async function ConversationDetailPage({
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

  // Fetch conversation
  const result = await getConversationById(id);

  if (result.error || !result.conversation) {
    redirect("/conversations");
  }

  return <ConversationDetail conversation={result.conversation} lead={result.lead} />;
}
