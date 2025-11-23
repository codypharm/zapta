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
import type { Integration } from "@/lib/integrations/base";
import { useToast } from "@/hooks/use-toast";

interface IntegrationCardProps {
  integration: Integration;
  onUpdate: (integration: Integration) => void;
  onDelete: (integrationId: string) => void;
  onConfigure?: (integration: Integration) => void;
}

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
    const icons: Record<string, string> = {
      email: "📧",
      slack: "💬",
      hubspot: "🎯",
      webhook: "🔗",
      twilio: "📱",
      google_calendar: "📅",
    };
    return icons[provider] || "🔌";
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      email: "Email",
      slack: "Slack",
      hubspot: "HubSpot",
      webhook: "Webhook",
      twilio: "Twilio SMS",
      google_calendar: "Google Calendar",
    };
    return names[provider] || provider;
  };

  const handleTestConnection = async () => {
    console.log('[TEST] Starting connection test for:', integration.provider);
    setIsTesting(true);
    try {
      const result = await testIntegration(integration.id);
      console.log('[TEST] Test result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle both boolean and object results
      if (typeof result === 'object' && result.success !== undefined) {
        console.log('[TEST] Showing toast - success:', result.success);
        toast({
          title: result.success ? "Connection Successful" : "Connection Failed",
          description: result.message || (result.success ? `${getProviderName(integration.provider)} is working correctly` : "Failed to connect"),
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
             integration.provider !== 'hubspot' && 
             integration.provider !== 'google_calendar' && (
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
