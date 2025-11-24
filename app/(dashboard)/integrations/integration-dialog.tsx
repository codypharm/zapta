/**
 * Integration Dialog Component
 * Handles creating and configuring new integrations
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createIntegration, updateIntegration, testIntegration } from "@/lib/integrations/actions";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "@/lib/integrations/base";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface IntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
    id: string;
    name: string;
    description: string;
    type: string;
    icon: string;
    features: string[];
  };
  existingIntegration?: Integration; // For edit mode
  onIntegrationCreated: (integration: any) => void;
  onIntegrationUpdated?: (integration: any) => void;
}

export function IntegrationDialog({
  isOpen,
  onClose,
  provider,
  existingIntegration,
  onIntegrationCreated,
  onIntegrationUpdated,
}: IntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<Record<string, any>>({});
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // Webhook filter state
  const [eventTypes, setEventTypes] = useState<string[]>(["agent.completed", "agent.failed"]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failure">("all");
  
  const { toast } = useToast();

  const isEditMode = !!existingIntegration;

  // Pre-fill form when editing
  useEffect(() => {
    if (existingIntegration) {
      setCredentials(existingIntegration.credentials || {});
      setConfig(existingIntegration.config || {});
      setWebhookUrl(existingIntegration.webhook_url || "");
    } else {
      // Reset form when creating new
      setCredentials({});
      setConfig({});
      setWebhookUrl("");
    }
  }, [existingIntegration, isOpen]);

  // Form field type
  interface FormField {
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    description?: string;
  }

  // Get form fields based on provider type
  const getFormFields = (): FormField[] => {
    switch (provider.type) {
      case "email":
        return [
          {
            key: "from_email",
            label: "From Email Address",
            type: "email",
            required: true,
            placeholder: "support@yourcompany.com",
          },
          {
            key: "from_name",
            label: "From Name",
            type: "text",
            required: false,
            placeholder: "Support Team",
          },
          {
            key: "api_key",
            label: "Custom Resend API Key (Optional)",
            type: "password",
            required: false,
            placeholder: "re_xxxxxxxxxxxx (leave empty to use platform email)",
          },
        ];
      case "slack":
        return [
          {
            key: "bot_token",
            label: "Bot Token",
            type: "password",
            required: true,
          },
          {
            key: "signing_secret",
            label: "Signing Secret",
            type: "password",
            required: true,
          },
          { key: "app_id", label: "App ID", type: "text", required: false },
        ];
      case "webhook":
        return [
          {
            key: "webhook_url",
            label: "Webhook URL",
            type: "url",
            required: true,
            placeholder: "https://your-domain.com/webhook",
            description: "The URL where webhook events will be sent (Zapier, Make.com, custom API)"
          },
          {
            key: "webhook_secret",
            label: "Webhook Secret (Optional)",
            type: "password",
            required: false,
            placeholder: "Optional secret for HMAC signature",
            description: "If provided, webhooks will include X-Webhook-Signature header for verification"
          },
          // Filter fields handled separately in UI
        ];
      case "sms":
        return [
          {
            key: "account_sid",
            label: "Custom Account SID (Optional)",
            type: "text",
            required: false,
            placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            description: "Leave empty to use platform SMS service",
          },
          {
            key: "auth_token",
            label: "Custom Auth Token (Optional)",
            type: "password",
            required: false,
            placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            description: "Leave empty to use platform SMS service",
          },
          {
            key: "from_number",
            label: "Custom From Number (Optional)",
            type: "text",
            required: false,
            placeholder: "+15551234567",
            description: "Leave empty to use platform SMS. If provided, must be a phone number purchased from Twilio and registered to your account (E.164 format)",
          },
        ];
      case "crm":
        // HubSpot uses OAuth - no form fields needed, it redirects to HubSpot
        return [];
      case "calendar":
        // Calendar uses OAuth - no credential fields needed
        return [];
      case "payment":
        return [
          {
            key: "secret_key",
            label: "Secret Key",
            type: "password",
            required: true,
          },
          {
            key: "publishable_key",
            label: "Publishable Key",
            type: "password",
            required: true,
          },
          {
            key: "webhook_secret",
            label: "Webhook Secret",
            type: "password",
            required: false,
          },
        ];
      case "communication":
        return [
          {
            key: "bot_token",
            label: "Bot Token",
            type: "password",
            required: true,
          },
          {
            key: "application_id",
            label: "Application ID",
            type: "text",
            required: true,
          },
          {
            key: "public_key",
            label: "Public Key",
            type: "password",
            required: true,
          },
        ];
      case "storage":
        return [
          {
            key: "client_id",
            label: "Client ID",
            type: "text",
            required: true,
          },
          {
            key: "client_secret",
            label: "Client Secret",
            type: "password",
            required: true,
          },
          {
            key: "redirect_uri",
            label: "Redirect URI",
            type: "url",
            required: true,
          },
        ];
      case "productivity":
        return [
          {
            key: "integration_token",
            label: "Integration Token",
            type: "password",
            required: true,
          },
          {
            key: "database_id",
            label: "Database ID (Optional)",
            type: "text",
            required: false,
          },
        ];
      case "development":
        return [
          {
            key: "personal_access_token",
            label: "Personal Access Token",
            type: "password",
            required: true,
          },
          {
            key: "webhook_secret",
            label: "Webhook Secret",
            type: "password",
            required: false,
          },
        ];
      default:
        return [];
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      // Create a temporary integration for testing
      const tempResult = await createIntegration({
        provider: provider.id,
        type: provider.type,
        credentials,
        config,
        webhook_url: webhookUrl || undefined,
      });

      if (tempResult.error) {
        throw new Error(tempResult.error);
      }

      // Test the connection
      const testResult = await testIntegration(tempResult.integration.id);

      if (testResult.error) {
        throw new Error(testResult.error);
      }

      toast({
        title: "Connection Successful",
        description: `Successfully connected to ${provider.name}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare credentials with webhook filters if this is a webhook integration
      let finalCredentials = { ...credentials };
      if (provider.type === "webhook") {
        finalCredentials = {
          ...credentials,
          event_types: eventTypes,
          agent_ids: selectedAgents,
          status_filter: statusFilter,
        };
      }

      if (isEditMode && existingIntegration) {
        // Update existing integration
        const result = await updateIntegration(existingIntegration.id, {
          credentials: finalCredentials,
          config,
          webhook_url: webhookUrl || undefined,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "Integration Updated",
          description: `Successfully updated ${provider.name}`,
        });

        onIntegrationUpdated?.(result.integration);
      } else {
        // Create new integration
        const result = await createIntegration({
          provider: provider.id,
          type: provider.type,
          credentials: finalCredentials,
          config,
          webhook_url: webhookUrl || undefined,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "Integration Created",
          description: `Successfully connected to ${provider.name}`,
        });

        onIntegrationCreated(result.integration);
      }
      
      onClose();
    } catch (error) {
      toast({
        title: isEditMode ? "Failed to Update Integration" : "Failed to Create Integration",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = getFormFields();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{provider.icon}</span>
              <AlertDialogTitle>
                {isEditMode ? `Configure ${provider.name}` : `Connect to ${provider.name}`}
              </AlertDialogTitle>
            </div>
            {/* Close button for OAuth integrations */}
            {formFields.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                ✕
              </Button>
            )}
          </div>
          <AlertDialogDescription>
            {provider.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" id="integration-form">
          {/* Features */}
          <div>
            <Label className="text-sm font-medium">Features</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {provider.features.map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* OAuth Integration - Show Connect Button */}
          {formFields.length === 0 && !isEditMode ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed bg-slate-50 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                  {provider.icon}
                </div>
                <h4 className="mb-2 text-lg font-semibold text-gray-900">
                  Connect to {provider.name}
                </h4>
                <p className="mb-6 text-sm text-gray-600">
                  You'll be redirected to {provider.name} to securely authorize access.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    // Use hyphen in URL to match API routes
                    const routePath = provider.id.replace('_', '-');
                    window.location.href = `/api/integrations/${routePath}/auth`;
                  }}
                  className="w-full max-w-sm"
                  size="lg"
                >
                  Connect to {provider.name}
                </Button>
              </div>
            </div>
          ) : (
            /* Form Fields */
            <>
          {formFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground mt-1 mb-2">
                  {field.description}
                </p>
              )}
              {field.type === "email" ? (
                <Textarea
                  id={field.key}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              ) : field.type === "password" ? (
                <Input
                  id={field.key}
                  type="password"
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              ) : field.type === "number" ? (
                <Input
                  id={field.key}
                  type="number"
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}
          
          {/* Webhook-specific filter UI */}
          {provider.type === "webhook" && formFields.length > 0 && (
            <>
              <div className="space-y-4 border-t pt-4 mt-4">
                <div>
                  <Label className="text-base font-semibold">Event Filters</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which events should trigger this webhook
                  </p>
                </div>

                {/* Event Type Checkboxes */}
                <div className="space-y-2">
                  <Label>Event Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="event-completed"
                        checked={eventTypes.includes("agent.completed")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEventTypes([...eventTypes, "agent.completed"]);
                          } else {
                            setEventTypes(eventTypes.filter(e => e !== "agent.completed"));
                          }
                        }}
                      />
                      <label
                        htmlFor="event-completed"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Agent Completed
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="event-failed"
                        checked={eventTypes.includes("agent.failed")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEventTypes([...eventTypes, "agent.failed"]);
                          } else {
                            setEventTypes(eventTypes.filter(e => e !== "agent.failed"));
                          }
                        }}
                      />
                      <label
                        htmlFor="event-failed"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Agent Failed
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select at least one event type
                  </p>
                </div>

                {/* Status Filter Radio Buttons */}
                <div className="space-y-2">
                  <Label>Status Filter</Label>
                  <RadioGroup
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as "all" | "success" | "failure")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="status-all" />
                      <label htmlFor="status-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        All events (success and failure)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="success" id="status-success" />
                      <label htmlFor="status-success" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Success only
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="failure" id="status-failure" />
                      <label htmlFor="status-failure" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Failures only
                      </label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Filter events based on success or failure status
                  </p>
                </div>

                {/* Note about agent filtering */}
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> By default, webhooks receive events from all agents. To filter by specific agents, you can configure this later via the database.
                  </p>
                </div>
              </div>
            </>
          )}
            </>
          )}

          {/* Webhook URL (for Slack - receives events FROM Slack) */}
          {provider.type === "slack" && (
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://your-domain.com/api/webhooks/slack"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This URL will receive webhook events from {provider.name}
              </p>
            </div>
          )}

          {/* Footer - Hide for OAuth integrations */}
          {formFields.length > 0 && (
            <div className="flex justify-end space-x-2 border-t pt-4 mt-6">
              <AlertDialogCancel onClick={(e) => {
                e.preventDefault();
                onClose();  
              }} className="h-9">Cancel</AlertDialogCancel>
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              )}
              <Button type="submit" disabled={isLoading} form="integration-form">
                {isLoading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Integration"
                  : "Create Integration"}
              </Button>
            </div>
          )}
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
