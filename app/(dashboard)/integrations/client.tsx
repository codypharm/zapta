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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Integrations</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="slack">Slack</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableProviders.map((provider) => {
              const hasIntegration = integrations.some(
                (i) => i.type === provider.type
              );

              return (
                <Card key={provider.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{provider.icon}</span>
                        <CardTitle className="text-lg">
                          {provider.name}
                        </CardTitle>
                      </div>
                      {hasIntegration && (
                        <Badge variant="secondary">Connected</Badge>
                      )}
                    </div>
                    <CardDescription>{provider.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-1">
                        {provider.features.map((feature) => (
                          <Badge
                            key={feature}
                            variant="outline"
                            className="text-xs"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        variant={hasIntegration ? "outline" : "default"}
                        onClick={() => {
                          setSelectedProvider(provider);
                          setIsDialogOpen(true);
                        }}
                      >
                        {hasIntegration ? "Configure" : "Connect"}
                      </Button>
                    </div>
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
              />
            ))}

            {getAvailableProviders("email").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("slack").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("crm").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("webhook").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("sms").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("calendar").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("payment").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("communication").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("storage").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("productivity").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
              />
            ))}

            {getAvailableProviders("development").map((provider) => (
              <Card key={`new-${provider.id}`} className="border-dashed">
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
          }}
          provider={selectedProvider}
          onIntegrationCreated={handleIntegrationCreated}
        />
      )}
    </div>
  );
}
