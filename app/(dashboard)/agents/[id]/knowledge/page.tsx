/**
 * Agent Knowledge Base Page
 * Manage documents and knowledge base for specific agents
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DocumentUpload } from "@/components/knowledge/document-upload";
import { DocumentsList } from "@/components/knowledge/documents-list";
import { KnowledgeAnalytics } from "@/components/knowledge/knowledge-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string;
}

export default function AgentKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentId, setAgentId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = await params;
        setAgentId(id);
        
        const supabase = createClient();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Get user's tenant_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.tenant_id) {
          router.push("/login");
          return;
        }

        // Fetch agent
        const { data: agentData, error } = await supabase
          .from("agents")
          .select("id, name, description")
          .eq("id", id)
          .eq("tenant_id", profile.tenant_id)
          .single();

        if (error || !agentData) {
          router.push("/agents");
          return;
        }

        setAgent(agentData);
      } catch (error) {
        console.error("Error fetching agent:", error);
        router.push("/agents");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Agent not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/agents/${agentId}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Agent
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Manage documents for <span className="font-medium">{agent.name}</span>
            </p>
          </div>
        </div>

        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="manage">Manage Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <DocumentUpload 
                agentId={agentId}
                onUploadComplete={handleUploadComplete}
              />
              
              <DocumentsList 
                agentId={agentId}
                refreshKey={refreshKey}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <KnowledgeAnalytics agentId={agentId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}