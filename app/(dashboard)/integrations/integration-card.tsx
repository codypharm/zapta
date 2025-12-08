/**
 * Integration Card Component
 * Displays a single integration with actions
 */

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateIntegration,
  deleteIntegration,
  testIntegration,
} from "@/lib/integrations/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Trash2, RefreshCw, CheckCircle, XCircle, LucideIcon, Mail, MessageSquare, Target, Link, Smartphone, FileText, CreditCard, Plug } from "lucide-react";
import type { Integration } from "@/lib/integrations/base";

// Google "G" icon component for Google products
const GoogleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
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
const SlackIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/>
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
const HubSpotIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M18.164 7.93V5.653a2.165 2.165 0 0 0 1.267-1.967 2.169 2.169 0 0 0-2.168-2.168 2.169 2.169 0 0 0-2.168 2.168c0 .863.502 1.607 1.23 1.962v2.282a5.094 5.094 0 0 0-2.381 1.04L6.49 3.469a2.664 2.664 0 0 0 .073-.641 2.682 2.682 0 0 0-2.683-2.683 2.682 2.682 0 0 0-2.683 2.683 2.682 2.682 0 0 0 2.683 2.683c.497 0 .963-.132 1.365-.365l7.383 5.46a5.128 5.128 0 0 0-.438 2.066c0 .744.158 1.451.444 2.088l-2.283 2.283a2.162 2.162 0 0 0-1.298-.43 2.169 2.169 0 0 0-2.168 2.168 2.169 2.169 0 0 0 2.168 2.168 2.169 2.169 0 0 0 2.168-2.168c0-.477-.153-.92-.416-1.276l2.248-2.248a5.153 5.153 0 0 0 3.187 1.093 5.154 5.154 0 0 0 5.152-5.152 5.153 5.153 0 0 0-4.328-5.086zm-1.04 7.37a2.284 2.284 0 1 1 0-4.568 2.284 2.284 0 0 1 0 4.568z" fill="#FF7A59"/>
  </svg>
);

// Notion logo icon component
const NotionIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.015c-.42-.327-.933-.56-2.008-.467l-12.77.793c-.466.047-.559.28-.373.466l1.75 1.401zm.79 2.801v13.823c0 .747.373 1.027 1.213.98l14.523-.84c.84-.046 1.027-.512 1.027-1.12V5.958c0-.606-.233-.886-.84-.84l-15.09.886c-.653.047-.886.28-.886.42zm14.36.653c.093.42 0 .84-.42.886l-.7.14v10.236c-.606.327-1.166.513-1.633.513-.746 0-.933-.233-1.493-.933l-4.573-7.198v6.965l1.446.327s0 .84-1.166.84l-3.218.186c-.093-.186 0-.653.327-.746l.84-.233V9.202l-1.166-.093c-.093-.42.14-.98.746-1.027l3.499-.233 4.663 7.152v-6.292l-1.213-.14c-.093-.466.28-.84.7-.886l3.362-.233z" fill="currentColor"/>
  </svg>
);

// Twilio logo icon component (red circle with 4 dots)
const TwilioIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <circle cx="12" cy="12" r="11" stroke="#F22F46" strokeWidth="2" fill="white"/>
    <circle cx="8.5" cy="8.5" r="2" fill="#F22F46"/>
    <circle cx="15.5" cy="8.5" r="2" fill="#F22F46"/>
    <circle cx="8.5" cy="15.5" r="2" fill="#F22F46"/>
    <circle cx="15.5" cy="15.5" r="2" fill="#F22F46"/>
  </svg>
);

interface IntegrationCardProps {
  integration: Integration;
  onUpdate: (integration: Integration) => void;
  onDelete: (integrationId: string) => void;
  onConfigure?: (integration: Integration) => void;
}

// Icon components for providers without brand icons
const ProviderIcons: Record<string, LucideIcon> = {
  email: Mail,
  webhook: Link,
  stripe: CreditCard,
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

// Resend logo icon component (stylized R)
const ResendIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M3.75 3.75V20.25H6.75V14.25H9.75L14.25 20.25H18L13.125 13.875C15.1875 13.125 16.5 11.25 16.5 9C16.5 6 14.25 3.75 11.25 3.75H3.75ZM6.75 6.75H11.25C12.6 6.75 13.5 7.65 13.5 9C13.5 10.35 12.6 11.25 11.25 11.25H6.75V6.75Z" fill="currentColor"/>
  </svg>
);

// Stripe logo icon component
const StripeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="4" fill="#635BFF"/>
    <path d="M11.5 8.5C11.5 7.4 12.4 7 13.7 7C14.7 7 16 7.3 17 7.8V4.5C15.9 4.1 14.8 4 13.7 4C10.6 4 8.5 5.7 8.5 8.7C8.5 13.3 14.5 12.5 14.5 14.5C14.5 15.8 13.4 16.1 12.1 16.1C11 16.1 9.5 15.6 8.4 15V18.4C9.6 18.9 10.8 19.1 12.1 19.1C15.3 19.1 17.5 17.5 17.5 14.4C17.5 9.4 11.5 10.4 11.5 8.5Z" fill="white"/>
  </svg>
);

export function IntegrationCard({
  integration,
  onUpdate,
  onDelete,
  onConfigure,
}: IntegrationCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const getProviderIcon = (provider: string) => {
    // Use Google icon for Google products
    if (googleProviders.includes(provider)) {
      return <GoogleIcon className="h-5 w-5" />;
    }
    
    // Use Slack icon for Slack
    if (slackProviders.includes(provider)) {
      return <SlackIcon className="h-5 w-5" />;
    }
    
    // Use HubSpot icon for HubSpot
    if (hubspotProviders.includes(provider)) {
      return <HubSpotIcon className="h-5 w-5" />;
    }
    
    // Use Notion icon for Notion
    if (notionProviders.includes(provider)) {
      return <NotionIcon className="h-5 w-5" />;
    }
    
    // Use Twilio icon for Twilio
    if (twilioProviders.includes(provider)) {
      return <TwilioIcon className="h-5 w-5" />;
    }
    
    // Use Resend icon for email
    if (resendProviders.includes(provider)) {
      return <ResendIcon className="h-5 w-5" />;
    }
    
    // Use Stripe icon for Stripe
    if (stripeProviders.includes(provider)) {
      return <StripeIcon className="h-5 w-5" />;
    }
    
    const IconComponent = ProviderIcons[provider] || Plug;
    return <IconComponent className="h-5 w-5" />;
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      email: "Email (Resend)",
      gmail: "Gmail",
      slack: "Slack",
      hubspot: "HubSpot",
      webhook: "Webhook",
      twilio: "Twilio SMS",
      google_calendar: "Google Calendar",
      google_drive: "Google Drive",
      google_sheets: "Google Sheets",
      google_docs: "Google Docs",
      notion: "Notion",
      stripe: "Stripe",
    };
    return names[provider] || provider;
  };

  const handleTestConnection = async () => {
    console.log('[TEST] Starting connection test for:', integration.provider);
    setIsTesting(true);
    try {
      const result = await testIntegration(integration.id);
      console.log('[TEST] Test result:', result);

      if ('error' in result && result.error) {
        throw new Error(result.error);
      }

      // Handle both boolean and object results
      const hasSuccess = 'success' in result;
      if (hasSuccess) {
        console.log('[TEST] Showing toast - success:', result.success);
        toast({
          title: result.success ? "Connection Successful" : "Connection Failed",
          description: ('message' in result && result.message) || (result.success ? `${getProviderName(integration.provider)} is working correctly` : "Failed to connect"),
          variant: result.success ? "default" : "destructive",
        });
      } else {
        console.log('[TEST] Showing fallback toast');
        // Fallback for boolean results
        toast({
          title: "Connection Successful",
          description: `${getProviderName(integration.provider)} is working correctly`,
        });
      }
    } catch (error) {
      console.error('[TEST] Error during test:', error);
      toast({
        title: "Connection Test Failed",
        description:
          error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      console.log('[TEST] Test complete, resetting button');
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteIntegration(integration.id);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Integration deleted successfully",
      });
      setDeleteDialogOpen(false);
      onDelete(integration.id);
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete integration",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      {/* Status Indicator Dot */}
      <div className="absolute right-4 top-4 z-10">
        <div
          className={`h-3 w-3 rounded-full ring-2 ring-white ${
            integration.status === "connected"
              ? "bg-green-500 shadow-lg shadow-green-500/50"
              : "bg-red-500 shadow-lg shadow-red-500/50"
          }`}
        />
      </div>

      {/* Subtle Accent Bar */}
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-slate-400 to-slate-500" />

      <CardHeader>
        <div className="flex items-start space-x-4">
          {/* Icon with Subtle Background */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-3xl shadow-sm transition-transform group-hover:scale-110">
            {getProviderIcon(integration.provider)}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold">
              {getProviderName(integration.provider)}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Connected on {new Date(integration.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Integration details */}
          {integration.webhook_url && (
            <div className="rounded-lg border bg-white p-3">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Webhook URL:</span>
                <p className="mt-1 truncate rounded bg-slate-50 px-2 py-1 font-mono text-xs">
                  {integration.webhook_url}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            {onConfigure && 
             !['hubspot', 'google_calendar', 'google_drive', 'google_sheets', 'google_docs', 'gmail', 'notion', 'slack'].includes(integration.provider) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(integration)}
              >
                Configure
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? "Testing..." : "Test"}
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              <AlertDialogContent>

                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Integration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete{" "}
                    {getProviderName(integration.provider)} integration? This
                    action cannot be undone and may affect any agents using this
                    integration.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete Integration"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
