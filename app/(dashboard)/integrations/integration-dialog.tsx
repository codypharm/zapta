/**
 * Integration Dialog Component
 * Handles creating and configuring new integrations
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createIntegration, testIntegration } from "@/lib/integrations/actions";
import { useToast } from "@/hooks/use-toast";
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
  onIntegrationCreated: (integration: any) => void;
}

export function IntegrationDialog({
  isOpen,
  onClose,
  provider,
  onIntegrationCreated,
}: IntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, any>>({});
  const [config, setConfig] = useState<Record<string, any>>({});
  const [webhookUrl, setWebhookUrl] = useState("");
  const { toast } = useToast();

  // Get form fields based on provider type
  const getFormFields = () => {
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
    } catch (error) {
      toast({
        title: "Failed to Create Integration",
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
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{provider.icon}</span>
            <AlertDialogTitle>Connect to {provider.name}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {provider.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Form Fields */}
          {formFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.key}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
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
                  placeholder={`Enter ${field.label.toLowerCase()}`}
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
                  placeholder={`Enter ${field.label.toLowerCase()}`}
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
                  placeholder={`Enter ${field.label.toLowerCase()}`}
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

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isLoading}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>

            <div className="space-x-2">
              <AlertDialogAction onClick={onClose}>Cancel</AlertDialogAction>
              <AlertDialogAction type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Integration"}
              </AlertDialogAction>
            </div>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
