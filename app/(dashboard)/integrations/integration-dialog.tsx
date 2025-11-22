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
          { key: "url", label: "Webhook URL", type: "url", required: true },
          {
            key: "secret",
            label: "Secret (Optional)",
            type: "password",
            required: false,
          },
          {
            key: "headers",
            label: "Custom Headers (JSON)",
            type: "textarea",
            required: false,
          },
        ];
      case "sms":
        return [
          {
            key: "account_sid",
            label: "Account SID",
            type: "text",
            required: true,
          },
          {
            key: "auth_token",
            label: "Auth Token",
            type: "password",
            required: true,
          },
          {
            key: "from_number",
            label: "From Number",
            type: "text",
            required: true,
          },
        ];
      case "crm":
        return [
          {
            key: "client_id",
            label: "HubSpot Client ID",
            type: "text",
            required: true,
          },
          {
            key: "client_secret",
            label: "HubSpot Client Secret",
            type: "password",
            required: true,
          },
          {
            key: "portal_id",
            label: "Portal ID (Optional)",
            type: "text",
            required: false,
          },
        ];
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
      if (isEditMode && existingIntegration) {
        // Update existing integration
        const result = await updateIntegration(existingIntegration.id, {
          credentials,
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
          credentials,
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
              {field.type === "textarea" ? (
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
            </>
          )}

          {/* Webhook URL (for integrations that support it) */}
          {(provider.type === "slack" ||
            provider.type === "webhook" ||
            provider.type === "crm") && (
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
