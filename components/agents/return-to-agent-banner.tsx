/**
 * Return to Agent Creation Banner
 * Shows when user has a pending agent creation draft
 */

"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ReturnToAgentBanner() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftStep, setDraftStep] = useState(1);

  useEffect(() => {
    const savedForm = localStorage.getItem('agent-creation-draft');
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        setHasDraft(true);
        setDraftStep(parsed.currentStep || 1);
      } catch (error) {
        console.error('Failed to check draft:', error);
      }
    }
  }, []);

  if (!hasDraft) return null;

  const stepNames = ['Basic Info', 'Configuration', 'Knowledge', 'Integrations'];
  const stepName = stepNames[draftStep - 1] || 'Setup';

  return (
    <Alert className="border-primary bg-primary/5 mb-6">
      <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-semibold text-primary">Agent creation in progress</p>
            <p className="text-sm text-muted-foreground">
              You have an agent draft saved at step {draftStep}: {stepName}
            </p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link href="/agents/new">
            <ArrowLeft className="w-4 h-4" />
            Continue Creating Agent
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
