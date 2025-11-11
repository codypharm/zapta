"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, FileText, ArrowRight, X } from "lucide-react";
import Link from "next/link";

interface KnowledgeBasePromptProps {
  agentId: string;
}

export function KnowledgeBasePrompt({ agentId }: KnowledgeBasePromptProps) {
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if agent has any documents
    const checkDocuments = async () => {
      try {
        const response = await fetch(`/api/knowledge?agentId=${agentId}`);
        const data = await response.json();
        
        if (response.ok) {
          setHasDocuments(data.documents?.length > 0);
        }
      } catch (error) {
        console.error('Failed to check documents:', error);
        setHasDocuments(false);
      }
    };

    checkDocuments();
  }, [agentId]);

  // Check if user has previously dismissed this prompt
  useEffect(() => {
    const dismissed = localStorage.getItem(`knowledge-prompt-dismissed-${agentId}`);
    setIsDismissed(dismissed === 'true');
  }, [agentId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(`knowledge-prompt-dismissed-${agentId}`, 'true');
  };

  // Don't show if dismissed, still loading, or agent has documents
  if (isDismissed || hasDocuments === null || hasDocuments) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                💡 Make Your Agent Smarter
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Upload documents like FAQs, policies, or guides so your agent can provide 
                accurate answers about your business. Knowledge base makes responses more helpful!
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/agents/${agentId}/knowledge`}>
                    <FileText className="w-4 h-4 mr-2" />
                    Add Knowledge Base
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-blue-400 hover:text-blue-600"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}