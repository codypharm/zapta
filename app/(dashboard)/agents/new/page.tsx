/**
 * Create Agent Page
 * Multi-step wizard for creating new AI agents
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LeadCollectionSettings, type LeadCollectionConfig } from "@/components/agents/lead-collection-settings";
import Link from "next/link";

const AGENT_TYPES = [
  { value: "support", label: "Customer Support", description: "Handle customer inquiries and provide assistance" },
  { value: "sales", label: "Sales", description: "Qualify leads and assist with sales processes" },
  { value: "automation", label: "Automation", description: "Automate workflows and repetitive tasks" },
  { value: "analytics", label: "Analytics", description: "Analyze data and provide insights" },
];

const AI_MODELS = [
  // Gemini 3 (Latest - Best Overall)
  { value: "gemini-3-pro", label: "Gemini 3 Pro ⭐ NEW" },
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

export default function CreateAgentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    description: string;
    instructions: string;
    model: string;
    tone: string;
    leadCollection: LeadCollectionConfig;
  }>({
    name: "",
    type: "",
    description: "",
    instructions: "",
    model: "gemini-2.0-flash",
    tone: "professional",
    leadCollection: {
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
  
  // Integration selection state
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [formRestored, setFormRestored] = useState(false);

  // Restore form state from localStorage on mount
  useEffect(() => {
    const savedForm = localStorage.getItem('agent-creation-draft');
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        setFormData(parsed.formData || formData);
        setSelectedIntegrations(parsed.selectedIntegrations || []);
        
        // Restore the step they were on
        if (parsed.currentStep && typeof parsed.currentStep === 'number') {
          setCurrentStep(parsed.currentStep);
        }
        
        setFormRestored(true);
        console.log('Restored agent creation draft from localStorage');
      } catch (error) {
        console.error('Failed to restore form state:', error);
      }
    }
  }, []);

  // Auto-save form state to localStorage (debounced)
  useEffect(() => {
    if (!formRestored) return; // Don't save initial empty state
    
    const timeoutId = setTimeout(() => {
      const draftData = {
        formData,
        selectedIntegrations,
        currentStep, // Save current step
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('agent-creation-draft', JSON.stringify(draftData));
      console.log('Auto-saved agent creation draft (step', currentStep + ')');
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [formData, selectedIntegrations, currentStep, formRestored]);

  // Fetch user plan
  useEffect(() => {
    const loadUserPlan = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          return;
        }
        
        if (profile) {
          // Get plan from subscriptions table (source of truth)
          // Use limit(1) with ordering to safely handle any duplicate records
          const { data: subscriptions, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('tenant_id', profile.tenant_id)
            .eq('status', 'active')  // Only get active subscriptions
            .order('created_at', { ascending: false })  // Get most recent first
            .limit(1);
          
          const subscription = subscriptions?.[0];
          
          if (subscriptionError) {
            console.error('Subscription fetch error:', subscriptionError);
            // Fallback to tenants table if subscriptions query fails
            const { data: tenant, error: tenantError } = await supabase
              .from('tenants')
              .select('subscription_plan')
              .eq('id', profile.tenant_id)
              .single();
            
            if (tenantError) {
              console.error('Tenant fetch error:', tenantError);
              return;
            }
            
            if (tenant) {
              const plan = tenant.subscription_plan || 'free';
              console.log('Loaded user plan from tenants (fallback):', plan);
              setUserPlan(plan);
            }
            return;
          }
          
          if (subscription) {
            // Use plan_id from subscriptions table
            const plan = subscription.plan_id || 'free';
            console.log('Loaded user plan from subscriptions:', plan, '(status:', subscription.status + ')');
            setUserPlan(plan);
          } else {
            // No active subscription found, fallback to tenants table
            console.log('No active subscription found, checking tenants table');
            const { data: tenant } = await supabase
              .from('tenants')
              .select('subscription_plan')
              .eq('id', profile.tenant_id)
              .single();
            
            if (tenant) {
              const plan = tenant.subscription_plan || 'free';
              console.log('Loaded user plan from tenants (no active subscription):', plan);
              setUserPlan(plan);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user plan:', err);
      } finally {
        setLoadingPlan(false);
      }
    };
    loadUserPlan();
  }, []);

  // Fetch available integrations on mount
  useEffect(() => {
    const loadIntegrations = async () => {
      setLoadingIntegrations(true);
      try {
        const { getIntegrations } = await import("@/lib/integrations/actions");
        const result = await getIntegrations();
        if (result.integrations) {
          setAvailableIntegrations(result.integrations.filter(i => i.status === "connected"));
        }
      } catch (err) {
        console.error("Failed to load integrations:", err);
      } finally {
        setLoadingIntegrations(false);
      }
    };
    loadIntegrations();
  }, []);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError("Agent name is required");
          return false;
        }
        if (!formData.type) {
          setError("Please select an agent type");
          return false;
        }
        if (!formData.description.trim()) {
          setError("Description is required");
          return false;
        }
        return true;
      case 2:
        if (!formData.instructions.trim()) {
          setError("Instructions are required");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4)); // Now 4 steps
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { createAgent } = await import("@/lib/agents/actions");
      const result = await createAgent({
        ...formData,
        integration_ids: selectedIntegrations, // Include selected integrations
      });

      if (result.error) {
        setError(result.error);
      } else {
        // Clear draft from localStorage on successful creation
        localStorage.removeItem('agent-creation-draft');
        console.log('Cleared agent creation draft');
        router.push("/agents");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/agents")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create New Agent</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Follow the steps to configure your AI agent
          </p>
        </div>

        {/* Draft Restored Banner */}
        {formRestored && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💾</span>
                <span className="text-sm text-blue-900">
                  <strong>Draft restored!</strong> Your previous progress has been loaded. Continue where you left off.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('agent-creation-draft');
                  setFormRestored(false);
                  window.location.reload();
                }}
                className="h-8 text-blue-700 hover:text-blue-900"
              >
                Start Fresh
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center min-w-0">
                <div
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base shrink-0
                    ${
                      step < currentStep
                        ? "bg-primary text-white"
                        : step === currentStep
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    }
                  `}
                >
                  {step < currentStep ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step}
                </div>
                <span
                  className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium truncate ${
                    step <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step === 1 ? "Basics" : step === 2 ? "Configure" : step === 3 ? "Integrations" : "Review"}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 sm:mx-4 ${
                    step < currentStep ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your agent a name and choose its purpose
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Bot"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Agent Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {AGENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => updateFormData("type", type.value)}
                      className={`
                        p-3 sm:p-4 rounded-lg border-2 text-left transition-all
                        ${
                          formData.type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }
                      `}
                    >
                      <div className="font-semibold text-sm sm:text-base">{type.label}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

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
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Agent</CardTitle>
              <CardDescription>
                Define how your agent should behave
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Describe what this agent should do in plain English...

Example: You are a helpful customer support agent. Your goal is to assist customers with their questions about our product. Be friendly, professional, and concise in your responses. If you don't know an answer, admit it and offer to escalate to a human agent."
                  rows={10}
                  value={formData.instructions}
                  onChange={(e) => updateFormData("instructions", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the agent's role, tone, and behavior
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => updateFormData("model", value)}
                    disabled={loadingPlan}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => {
                        const { canUseModel } = require("@/lib/billing/plans");
                        const isAllowed = canUseModel(userPlan, model.value);
                        
                        return (
                          <SelectItem 
                            key={model.value} 
                            value={model.value}
                            disabled={!isAllowed}
                            className={!isAllowed ? "opacity-50 cursor-not-allowed" : ""}
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
                  {!loadingPlan && (
                    <p className="text-xs text-muted-foreground">
                      Your <span className="capitalize">{userPlan}</span> plan allows:{" "}
                      {(() => {
                        const { getPlanLimits } = require("@/lib/billing/plans");
                        const limits = getPlanLimits(userPlan);
                        if (limits.models === '*') {
                          // Business and Enterprise get all models including GPT-5
                          if (['business', 'enterprise'].includes(userPlan)) {
                            return 'All models including GPT-5';
                          }
                          return 'All models';
                        }
                        // Map model values to labels
                        const modelLabels = (limits.models as string[]).map(modelValue => {
                          const model = AI_MODELS.find(m => m.value === modelValue);
                          return model ? model.label : modelValue;
                        });
                        return modelLabels.join(", ");
                      })()}
                      {" "}
                      <Link href="/settings/billing" className="text-primary hover:underline">
                        Upgrade plan
                      </Link>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value) => updateFormData("tone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
        )}

        {/* Step 3: Select Integrations */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Integrations</CardTitle>
              <CardDescription>
                Choose which integrations this agent can access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingIntegrations ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading integrations...
                </div>
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
                    Select which integrations this agent can use. Leave all unchecked if the agent doesn't need any integrations.
                  </p>
                  <div className="space-y-3">
                    {availableIntegrations.map((integration) => (
                      <div key={integration.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id={integration.id}
                          checked={selectedIntegrations.includes(integration.id)}
                          onCheckedChange={(checked) => {
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
                        <label htmlFor={integration.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize">{integration.provider}</span>
                            <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                              {integration.status}
                            </Badge>
                          </div>
                          {integration.config?.webhook_url && (
                            <p className="text-xs text-muted-foreground">
                              {integration.config.webhook_url}
                            </p>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: You can always edit integration access later from the agent's settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Deploy</CardTitle>
              <CardDescription>
                Review your agent configuration before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="text-lg font-semibold">{formData.name}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Type</div>
                  <div className="capitalize">{formData.type}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Description</div>
                  <div>{formData.description}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Model</div>
                  <div>
                    {AI_MODELS.find((m) => m.value === formData.model)?.label}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tone</div>
                  <div className="capitalize">{formData.tone}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">Instructions</div>
                  <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                    {formData.instructions}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Lead Collection</div>
                  {formData.leadCollection.enabled ? (
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Enabled</span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Collecting Fields:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(formData.leadCollection.fields).map(([field, config]) =>
                            config.enabled && (
                              <span key={field} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                                {field} {config.required && <span className="text-red-500">*</span>}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      {formData.leadCollection.welcomeMessage && (
                        <div>
                          <div className="text-xs text-muted-foreground">Welcome Message:</div>
                          <div className="text-sm">{formData.leadCollection.welcomeMessage}</div>
                        </div>
                      )}
                      {formData.leadCollection.submitButtonText && (
                        <div>
                          <div className="text-xs text-muted-foreground">Button Text:</div>
                          <div className="text-sm">{formData.leadCollection.submitButtonText}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted p-4 rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="text-sm text-muted-foreground">Disabled</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} className="w-full sm:w-auto">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
