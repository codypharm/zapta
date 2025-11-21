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

import type { Integration } from "@/lib/integrations/base";
import { IntegrationCard } from "./integration-card";
import { IntegrationDialog } from "./integration-dialog";

interface IntegrationsClientProps {
  initialIntegrations: Integration[];
  availableProviders: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    icon: string;
    features: string[];
  }>;
}

export function IntegrationsClient({
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
    const configuredTypes = integrations.map((i) => i.type);
    return availableProviders.filter(
      (provider) =>
        provider.type === type &&
        !configuredTypes.includes(provider.type as any)
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
    setIsDialogOpen(false);
    setSelectedProvider(null);
    setSelectedIntegration(null);
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
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 p-8 shadow-sm">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-2 text-slate-300">
            Connect your AI agents to external services and platforms
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">📊 All</TabsTrigger>
          <TabsTrigger value="email">📧 Email</TabsTrigger>
          <TabsTrigger value="crm">🎯 CRM</TabsTrigger>
          <TabsTrigger value="slack">💬 Slack</TabsTrigger>
          <TabsTrigger value="webhook">🔗 Webhooks</TabsTrigger>
        </TabsList>

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
                  className="group cursor-pointer border-2 border-dashed transition-all hover:border-primary  hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl transition-transform group-hover:scale-110">
                        {provider.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold">
                          {provider.name}
                        </CardTitle>
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
                      {provider.icon}
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
                    <span className="text-2xl">{provider.icon}</span>
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
