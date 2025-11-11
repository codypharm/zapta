"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Code2, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AgentCreationSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agentData, setAgentData] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const agentId = searchParams.get('agentId');
    const agentName = searchParams.get('agentName');

    if (success === 'true' && agentId && agentName) {
      setAgentData({ id: agentId, name: decodeURIComponent(agentName) });
      
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        // Clean up URL without the success params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('success');
        newUrl.searchParams.delete('agentId'); 
        newUrl.searchParams.delete('agentName');
        router.replace(newUrl.pathname + newUrl.search);
        setAgentData(null);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!agentData) return null;

  const handleDismiss = () => {
    setAgentData(null);
    // Clean up URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('success');
    newUrl.searchParams.delete('agentId'); 
    newUrl.searchParams.delete('agentName');
    router.replace(newUrl.pathname + newUrl.search);
  };

  return (
    <Card className="mb-6 border-green-200 bg-green-50/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">
              🎉 Agent "{agentData.name}" created successfully!
            </h3>
            
            <p className="text-sm text-green-700 mb-4">
              Your agent is ready to chat! Here are the recommended next steps to make it even better:
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-medium">1</div>
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Upload documents to knowledge base for smarter responses</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-medium">2</div>
                <Code2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Configure widget settings for your website</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-medium">3</div>
                <MessageSquare className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Test your agent and refine its behavior</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                <Link href={`/agents/${agentData.id}/knowledge`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Add Knowledge Base
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              
              <Button asChild size="sm" variant="outline" className="border-green-300">
                <Link href={`/agents/${agentData.id}`}>
                  Test Agent
                </Link>
              </Button>
              
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}