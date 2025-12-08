"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { canUseModel, canUseIntegration } from "@/lib/billing/plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LeadCollectionSettings, type LeadCollectionConfig } from "@/components/agents/lead-collection-settings";

const AGENT_TYPES = [
  { value: "support", label: "Customer Support" },
  { value: "sales", label: "Sales" },
  { value: "automation", label: "Automation" },
  { value: "analytics", label: "Analytics" },
];

const AI_MODELS = [
  // Gemini 3 (Latest - Best Overall)
  { value: "gemini-3-pro", label: "Gemini 3 Pro ⭐ NEW" },
  // Gemini 2.5 
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (Fast)" },
  // Gemini 2.0
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-thinking", label: "Gemini 2.0 Flash Thinking" },
  // Gemini 1.5
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  // Claude 3.5
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  // OpenAI
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.5", label: "GPT-4.5" },
  { value: "gpt-5", label: "GPT-5 ⭐ NEW" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
];

interface AgentEditFormProps {
  agent: {
    id: string;
    name: string;
    type: string;
    description: string;
    config: {
      model: string;
      tone: string;
      instructions: string;
      leadCollection?: any;
    };
  };
}

export function AgentEditForm({ agent }: AgentEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  
  // Integration states
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  // Form data initialized with agent values
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    description: string;
    instructions: string;
    model: string;
    tone: string;
    leadCollection: LeadCollectionConfig;
  }>({
    name: agent.name,
    type: agent.type,
    description: agent.description,
    instructions: agent.config?.instructions || "",
    model: agent.config?.model || "gemini-2.5-flash",
    tone: agent.config?.tone || "professional",
    leadCollection: agent.config?.leadCollection || {
      enabled: false,
      fields: {
        name: { enabled: false, required: false },
        email: { enabled: false, required: false },
        phone: { enabled: false, required: false },
        company: { enabled: false, required: false },
      },
      welcomeMessage: "Let us know how to reach you",
      submitButtonText: "Start Chat",
    },
  });

  // Load integrations and user plan on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingIntegrations(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        
        // Load user plan
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.tenant_id) {
            const { data: subscription } = await supabase
              .from('subscriptions')
              .select('plan_id')
              .eq('tenant_id', profile.tenant_id)
              .eq('status', 'active')
              .single();
            
            if (subscription?.plan_id) {
              setUserPlan(subscription.plan_id);
            } else {
              const { data: tenant } = await supabase
                .from('tenants')
                .select('subscription_plan')
                .eq('id', profile.tenant_id)
                .single();
              if (tenant?.subscription_plan) {
                setUserPlan(tenant.subscription_plan);
              }
            }
          }
        }
        
        // Load available integrations
        const { getIntegrations } = await import("@/lib/integrations/actions");
        const result = await getIntegrations();
        if (result.integrations) {
          setAvailableIntegrations(result.integrations.filter(i => i.status === "connected"));
        }

        // Load agent's current integrations
        const { data: agentIntegrations } = await supabase
          .from('agent_integrations')
          .select('integration_id')
          .eq('agent_id', agent.id);
        
        if (agentIntegrations) {
          setSelectedIntegrations(agentIntegrations.map(ai => ai.integration_id));
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoadingIntegrations(false);
      }
    };
    loadData();
  }, [agent.id]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError("Agent name is required");
      return;
    }
    if (!formData.instructions.trim()) {
      setError("Instructions are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { updateAgent } = await import("@/lib/agents/actions");
      const result = await updateAgent(agent.id, {
        ...formData,
        integration_ids: selectedIntegrations,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/agents/${agent.id}`);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4"
          >
            <Link href={`/agents/${agent.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agent
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Agent</h1>
          <p className="text-muted-foreground mt-2">
            Update your agent's configuration
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Modify your agent's settings and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Bot"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Agent Type</Label>
                <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe what this agent does..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Describe what this agent should do in plain English..."
                  rows={10}
                  value={formData.instructions}
                  onChange={(e) => updateFormData("instructions", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the agent's role, tone, and behavior
                </p>
              </div>

              {/* Model & Tone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => updateFormData("model", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => {
                        const isAllowed = canUseModel(userPlan, model.value);
                        return (
                          <SelectItem 
                            key={model.value} 
                            value={model.value}
                            disabled={!isAllowed}
                            className={!isAllowed ? "opacity-50" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{model.label}</span>
                              {!isAllowed && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Upgrade
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value) => updateFormData("tone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          {tone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lead Collection Settings */}
              <LeadCollectionSettings
                config={formData.leadCollection}
                onChange={(config) => setFormData((prev) => ({ ...prev, leadCollection: config }))}
              />
            </CardContent>
          </Card>

          {/* Integrations Section */}
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Select which integrations this agent can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIntegrations ? (
                <p className="text-sm text-muted-foreground">Loading integrations...</p>
              ) : availableIntegrations.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>No integrations configured yet.</p>
                      <Link 
                        href="/integrations" 
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Set up integrations <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Grant this agent access to specific integrations. It will only be able to use the ones you select.
                  </p>
                  <div className="space-y-3">
                    {availableIntegrations.map((integration) => {
                      const isAllowed = canUseIntegration(userPlan, integration.provider);
                      
                      return (
                        <div 
                          key={integration.id} 
                          className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                            !isAllowed ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            id={`edit-${integration.id}`}
                            checked={selectedIntegrations.includes(integration.id)}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => {
                              if (!isAllowed) return;
                              if (checked) {
                                setSelectedIntegrations([...selectedIntegrations, integration.id]);
                              } else {
                                setSelectedIntegrations(
                                  selectedIntegrations.filter(id => id !== integration.id)
                                );
                              }
                            }}
                            className="mt-1"
                          />
                          <label htmlFor={`edit-${integration.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize">{integration.provider}</span>
                              <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                                {integration.status}
                              </Badge>
                              {!isAllowed && (
                                <Badge variant="outline" className="text-xs">
                                  Upgrade
                                </Badge>
                              )}
                            </div>
                            {integration.config?.webhook_url && (
                              <p className="text-xs text-muted-foreground">
                                {integration.config.webhook_url}
                              </p>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
