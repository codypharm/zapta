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
import { 
  Mail, 
  MessageSquare, 
  Target, 
  Link, 
  Smartphone, 
  FileText, 
  CreditCard,
  Plug,
  LucideIcon,
  X 
} from "lucide-react";

// Google "G" icon component for Google products
const GoogleIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Slack logo icon component
const SlackIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
    <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
    <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
    <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
    <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
  </svg>
);

// HubSpot logo icon component (sprocket)
const HubSpotIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M18.164 7.93V5.653a2.165 2.165 0 0 0 1.267-1.967 2.169 2.169 0 0 0-2.168-2.168 2.169 2.169 0 0 0-2.168 2.168c0 .863.502 1.607 1.23 1.962v2.282a5.094 5.094 0 0 0-2.381 1.04L6.49 3.469a2.664 2.664 0 0 0 .073-.641 2.682 2.682 0 0 0-2.683-2.683 2.682 2.682 0 0 0-2.683 2.683 2.682 2.682 0 0 0 2.683 2.683c.497 0 .963-.132 1.365-.365l7.383 5.46a5.128 5.128 0 0 0-.438 2.066c0 .744.158 1.451.444 2.088l-2.283 2.283a2.162 2.162 0 0 0-1.298-.43 2.169 2.169 0 0 0-2.168 2.168 2.169 2.169 0 0 0 2.168 2.168 2.169 2.169 0 0 0 2.168-2.168c0-.477-.153-.92-.416-1.276l2.248-2.248a5.153 5.153 0 0 0 3.187 1.093 5.154 5.154 0 0 0 5.152-5.152 5.153 5.153 0 0 0-4.328-5.086zm-1.04 7.37a2.284 2.284 0 1 1 0-4.568 2.284 2.284 0 0 1 0 4.568z" fill="#FF7A59"/>
  </svg>
);

// Notion logo icon component
const NotionIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.015c-.42-.327-.933-.56-2.008-.467l-12.77.793c-.466.047-.559.28-.373.466l1.75 1.401zm.79 2.801v13.823c0 .747.373 1.027 1.213.98l14.523-.84c.84-.046 1.027-.512 1.027-1.12V5.958c0-.606-.233-.886-.84-.84l-15.09.886c-.653.047-.886.28-.886.42zm14.36.653c.093.42 0 .84-.42.886l-.7.14v10.236c-.606.327-1.166.513-1.633.513-.746 0-.933-.233-1.493-.933l-4.573-7.198v6.965l1.446.327s0 .84-1.166.84l-3.218.186c-.093-.186 0-.653.327-.746l.84-.233V9.202l-1.166-.093c-.093-.42.14-.98.746-1.027l3.499-.233 4.663 7.152v-6.292l-1.213-.14c-.093-.466.28-.84.7-.886l3.362-.233z" fill="currentColor"/>
  </svg>
);

// Map provider IDs to Lucide icons (for providers without brand icons)
const ProviderIcons: Record<string, LucideIcon> = {
  webhook: Link,
};

// Google product providers
const googleProviders = ['gmail', 'google_calendar', 'google_drive', 'google_sheets', 'google_docs'];

// Slack provider
const slackProviders = ['slack'];

// HubSpot provider
const hubspotProviders = ['hubspot'];

// Notion provider
const notionProviders = ['notion'];

// Twilio provider
const twilioProviders = ['twilio'];

// Resend/Email provider
const resendProviders = ['email'];

// Stripe provider
const stripeProviders = ['stripe'];

// Twilio logo icon component (red circle with 4 dots)
const TwilioIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="11" stroke="#F22F46" strokeWidth="2" fill="white"/>
    <circle cx="8.5" cy="8.5" r="2" fill="#F22F46"/>
    <circle cx="15.5" cy="8.5" r="2" fill="#F22F46"/>
    <circle cx="8.5" cy="15.5" r="2" fill="#F22F46"/>
    <circle cx="15.5" cy="15.5" r="2" fill="#F22F46"/>
  </svg>
);

// Resend logo icon component (stylized R)
const ResendIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M3.75 3.75V20.25H6.75V14.25H9.75L14.25 20.25H18L13.125 13.875C15.1875 13.125 16.5 11.25 16.5 9C16.5 6 14.25 3.75 11.25 3.75H3.75ZM6.75 6.75H11.25C12.6 6.75 13.5 7.65 13.5 9C13.5 10.35 12.6 11.25 11.25 11.25H6.75V6.75Z" fill="currentColor"/>
  </svg>
);

// Stripe logo icon component
const StripeIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="4" fill="#635BFF"/>
    <path d="M11.5 8.5C11.5 7.4 12.4 7 13.7 7C14.7 7 16 7.3 17 7.8V4.5C15.9 4.1 14.8 4 13.7 4C10.6 4 8.5 5.7 8.5 8.7C8.5 13.3 14.5 12.5 14.5 14.5C14.5 15.8 13.4 16.1 12.1 16.1C11 16.1 9.5 15.6 8.4 15V18.4C9.6 18.9 10.8 19.1 12.1 19.1C15.3 19.1 17.5 17.5 17.5 14.4C17.5 9.4 11.5 10.4 11.5 8.5Z" fill="white"/>
  </svg>
);

// Helper to get icon component for provider
const getProviderIcon = (providerId: string, className: string = "h-6 w-6") => {
  if (googleProviders.includes(providerId)) {
    return <GoogleIcon className={className} />;
  }
  if (slackProviders.includes(providerId)) {
    return <SlackIcon className={className} />;
  }
  if (hubspotProviders.includes(providerId)) {
    return <HubSpotIcon className={className} />;
  }
  if (notionProviders.includes(providerId)) {
    return <NotionIcon className={className} />;
  }
  if (twilioProviders.includes(providerId)) {
    return <TwilioIcon className={className} />;
  }
  if (resendProviders.includes(providerId)) {
    return <ResendIcon className={className} />;
  }
  if (stripeProviders.includes(providerId)) {
    return <StripeIcon className={className} />;
  }
  const IconComponent = ProviderIcons[providerId] || Plug;
  return <IconComponent className={className} />;
};


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
    // OAuth providers - return empty to trigger OAuth flow
    const oauthProviders = ['google_calendar', 'google_drive', 'google_sheets', 'google_docs', 'hubspot', 'notion', 'gmail', 'slack'];
    if (oauthProviders.includes(provider.id)) {
      return [];
    }

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
            placeholder: "sk_test_... or sk_live_...",
            description: "Your Stripe secret key. Get it from dashboard.stripe.com/apikeys",
          },
          {
            key: "publishable_key",
            label: "Publishable Key",
            type: "password",
            required: true,
            placeholder: "pk_test_... or pk_live_...",
            description: "Your Stripe publishable key",
          },
          {
            key: "webhook_secret",
            label: "Webhook Secret (Optional)",
            type: "password",
            required: false,
            placeholder: "whsec_...",
            description: "For webhook signature verification (optional)",
          },
          {
            key: "_security_notice",
            label: "",
            type: "notice",
            required: false,
            description: "🔒 Your API keys are securely encrypted before storage. We never store plain text credentials.",
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
              {getProviderIcon(provider.id, "h-6 w-6")}
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
                  {getProviderIcon(provider.id, "h-8 w-8")}
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
                    // Map provider IDs to their OAuth endpoint paths
                    const oauthRoutes: Record<string, string> = {
                      'google_calendar': '/api/integrations/google-calendar/auth',
                      'google_drive': '/api/integrations/google-drive/auth',
                      'google_sheets': '/api/integrations/google-sheets/auth',
                      'google_docs': '/api/integrations/google-docs/auth',
                      'gmail': '/api/integrations/gmail/auth',
                      'hubspot': '/api/integrations/hubspot/auth',
                      'notion': '/api/integrations/notion/connect',
                      'slack': '/api/integrations/slack/auth',
                    };
                    const route = oauthRoutes[provider.id];
                    if (route) {
                      window.location.href = route;
                    } else {
                      // Fallback: try hyphenated /auth path
                      const routePath = provider.id.replace('_', '-');
                      window.location.href = `/api/integrations/${routePath}/auth`;
                    }
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
              {/* Handle notice type - just display text, no input */}
              {field.type === "notice" ? (
                <div className="bg-muted/50 border rounded-lg p-3 text-sm text-muted-foreground">
                  {field.description}
                </div>
              ) : (
                <>
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
                </>
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


          {/* Footer - Hide for OAuth integrations */}
          {formFields.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-2 sm:gap-0 border-t pt-4 mt-6">
              <AlertDialogCancel onClick={(e) => {
                e.preventDefault();
                onClose();  
              }} className="h-9 w-full sm:w-auto">Cancel</AlertDialogCancel>
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full sm:w-auto"
                >
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              )}
              <Button type="submit" disabled={isLoading} form="integration-form" className="w-full sm:w-auto">
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
