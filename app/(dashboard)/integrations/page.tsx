/**
 * Integrations Management Page
 * Allows users to configure and manage various integrations
 */

import { Suspense } from "react";
import {
  getIntegrations,
  getAvailableProviders,
} from "@/lib/integrations/actions";
import { IntegrationsClient } from "./client";

export const dynamic = "force-dynamic";

async function IntegrationsPage() {
  // Fetch integrations and available providers
  const integrationsResult = await getIntegrations();
  const availableProviders = await getAvailableProviders();

  if (integrationsResult.error) {
    throw new Error(integrationsResult.error);
  }

  return (
    <div className="container mx-auto p-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your agents to external services and automate workflows
            </p>
          </div>
        </div>

        <Suspense fallback={<div>Loading integrations...</div>}>
          <IntegrationsClient
            initialIntegrations={integrationsResult.integrations || []}
            availableProviders={availableProviders}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default IntegrationsPage;
