/**
 * Create Agent Page
 * Multi-step wizard for creating new AI agents
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AGENT_TYPES = [
  { value: "support", label: "Customer Support", description: "Handle customer inquiries and provide assistance" },
  { value: "sales", label: "Sales", description: "Qualify leads and assist with sales processes" },
  { value: "automation", label: "Automation", description: "Automate workflows and repetitive tasks" },
  { value: "analytics", label: "Analytics", description: "Analyze data and provide insights" },
];

const AI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Free, Fast)" },
  { value: "gemini-1.5-pro", label: "Gemini 2.5 Pro (Free, Smart)" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "gpt-4", label: "GPT-4" },
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

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    instructions: "",
    model: "gemini-2.5-flash",
    tone: "professional",
  });

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
      setCurrentStep((prev) => Math.min(prev + 1, 3));
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
      const result = await createAgent(formData);

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/agents");
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
            onClick={() => router.push("/agents")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
          <p className="text-muted-foreground mt-2">
            Follow the steps to configure your AI agent
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${
                      step < currentStep
                        ? "bg-primary text-white"
                        : step === currentStep
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    }
                  `}
                >
                  {step < currentStep ? <Check className="w-5 h-5" /> : step}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    step <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step === 1 ? "Basics" : step === 2 ? "Configure" : "Review"}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
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
                <div className="grid grid-cols-2 gap-4">
                  {AGENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => updateFormData("type", type.value)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${
                          formData.type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }
                      `}
                    >
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => updateFormData("model", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
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
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
