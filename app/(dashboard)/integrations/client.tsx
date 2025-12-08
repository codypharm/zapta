/**
 * Integrations Client Component
 * Handles the interactive parts of the integrations management
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  LayoutGrid
} from "lucide-react";

import type { Integration } from "@/lib/integrations/base";
import { IntegrationCard } from "./integration-card";
import { IntegrationDialog } from "./integration-dialog";

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

// Map provider IDs to Lucide icons (for providers without brand icons)
const ProviderIcons: Record<string, LucideIcon> = {
  webhook: Link,
};

// Provider arrays
const googleProviders = ['gmail', 'google_calendar', 'google_drive', 'google_sheets', 'google_docs'];
const slackProviders = ['slack'];
const hubspotProviders = ['hubspot'];
const notionProviders = ['notion'];
const twilioProviders = ['twilio'];
const resendProviders = ['email'];
const stripeProviders = ['stripe'];

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

interface IntegrationsClientProps {
  initialIntegrations: Integration[];
  availableProviders: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    icon: string;
    features: string[];
    coming_soon?: boolean;
  }>;
}

export default function IntegrationsClient({
  initialIntegrations,
  availableProviders,
}: IntegrationsClientProps) {
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<
    (typeof availableProviders)[0] | null
  >(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Group integrations by type
  const integrationsByType = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.type]) {
        acc[integration.type] = [];
      }
      acc[integration.type].push(integration);
      return acc;
    },
    {} as Record<string, Integration[]>
  );

  // Get available providers that aren't already configured
  const getAvailableProviders = (type: string) => {
    const configuredProviderIds = integrations.map((i) => i.provider);
    return availableProviders.filter(
      (provider) =>
        provider.type === type &&
        !configuredProviderIds.includes(provider.id)
    );
  };

  const handleIntegrationCreated = (newIntegration: Integration) => {
    setIntegrations((prev) => [...prev, newIntegration]);
    setIsDialogOpen(false);
    setSelectedProvider(null);
    setSelectedIntegration(null);
  };

  const handleIntegrationUpdated = (updatedIntegration: Integration) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === updatedIntegration.id
          ? updatedIntegration
          : integration
      )
    );
  };

  const handleIntegrationDeleted = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.filter((integration) => integration.id !== integrationId)
    );
  };

  const handleConfigure = (integration: Integration) => {
    const provider = availableProviders.find(
      (p) => p.id === integration.provider
    );
    if (provider) {
      setSelectedProvider(provider);
      setSelectedIntegration(integration);
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">

      <Tabs defaultValue="all" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="mb-6 flex-wrap sm:flex-nowrap inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="whitespace-nowrap gap-1.5"><LayoutGrid className="h-4 w-4" /> All</TabsTrigger>
            <TabsTrigger value="email" className="whitespace-nowrap gap-1.5"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="calendar" className="whitespace-nowrap gap-1.5"><Calendar className="h-4 w-4" /> Calendar</TabsTrigger>
            <TabsTrigger value="payment" className="whitespace-nowrap gap-1.5"><CreditCard className="h-4 w-4" /> Payment</TabsTrigger>
            <TabsTrigger value="document" className="whitespace-nowrap gap-1.5"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
            <TabsTrigger value="crm" className="whitespace-nowrap gap-1.5"><Target className="h-4 w-4" /> CRM</TabsTrigger>
            <TabsTrigger value="sms" className="whitespace-nowrap gap-1.5"><Smartphone className="h-4 w-4" /> SMS</TabsTrigger>
            <TabsTrigger value="slack" className="whitespace-nowrap gap-1.5"><MessageSquare className="h-4 w-4" /> Slack</TabsTrigger>
            <TabsTrigger value="webhook" className="whitespace-nowrap gap-1.5"><Link className="h-4 w-4" /> Webhooks</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Show existing integrations */}
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {/* Show available providers to connect */}
            {availableProviders.map((provider) => {
              const hasIntegration = integrations.some(
                (i) => i.provider === provider.id
              );

              // Skip if already connected
              if (hasIntegration) return null;

              return (
                <Card
                  key={`new-${provider.id}`}
                  className={`group ${provider.coming_soon ? 'opacity-60' : 'cursor-pointer'} border-2 border-dashed transition-all hover:border-primary hover:shadow-lg`}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-transform group-hover:scale-110">
                        {getProviderIcon(provider.id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold">
                            {provider.name}
                          </CardTitle>
                          {provider.coming_soon && (
                            <Badge variant="secondary" className="text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={provider.coming_soon}
                      onClick={() => {
                        if (!provider.coming_soon) {
                          setSelectedProvider(provider);
                          setIsDialogOpen(true);
                        }
                      }}
                    >
                      {provider.coming_soon ? 'Coming Soon' : '+ Connect'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Show tabs for all integration types, even if no integrations exist */}
        <TabsContent value="email" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Integrations</h3>
            {getAvailableProviders("email").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("email")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["email"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("email").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-transform group-hover:scale-110">
                      {getProviderIcon(provider.id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    + Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slack" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Slack Integrations</h3>
            {getAvailableProviders("slack").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("slack")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["slack"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("slack").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crm" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">CRM Integrations</h3>
            {getAvailableProviders("crm").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("crm")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["crm"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("crm").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhook Integrations</h3>
            {getAvailableProviders("webhook").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("webhook")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["webhook"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("webhook").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">SMS Integrations</h3>
            {getAvailableProviders("sms").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("sms")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["sms"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("sms").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Calendar Integrations</h3>
            {getAvailableProviders("calendar").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("calendar")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["calendar"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("calendar").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payment Integrations</h3>
            {getAvailableProviders("payment").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("payment")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["payment"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("payment").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="document" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Document Integrations</h3>
            {getAvailableProviders("document").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("document")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["document"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("document").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-transform group-hover:scale-110">
                      {getProviderIcon(provider.id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold">{provider.name}</CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    + Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Communication Integrations
            </h3>
            {getAvailableProviders("communication").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(
                    getAvailableProviders("communication")[0]
                  );
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["communication"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("communication").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Storage Integrations</h3>
            {getAvailableProviders("storage").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("storage")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["storage"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("storage").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Productivity Integrations</h3>
            {getAvailableProviders("productivity").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("productivity")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["productivity"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("productivity").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="development" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Development Integrations</h3>
            {getAvailableProviders("development").length > 0 && (
              <Button
                onClick={() => {
                  setSelectedProvider(getAvailableProviders("development")[0]);
                  setIsDialogOpen(true);
                }}
              >
                Add New
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrationsByType["development"]?.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onUpdate={handleIntegrationUpdated}
                onDelete={handleIntegrationDeleted}
                onConfigure={handleConfigure}
              />
            ))}

            {getAvailableProviders("development").map((provider) => (
              <Card key={`new-${provider.id}`} className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getProviderIcon(provider.id)}</span>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsDialogOpen(true);
                    }}
                  >
                    Connect {provider.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedProvider && (
        <IntegrationDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedProvider(null);
            setSelectedIntegration(null);
          }}
          provider={selectedProvider}
          existingIntegration={selectedIntegration || undefined}
          onIntegrationCreated={handleIntegrationCreated}
          onIntegrationUpdated={handleIntegrationUpdated}
        />
      )}
    </div>
  );
}
