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
}

export function IntegrationCard({
  integration,
  onUpdate,
  onDelete,
}: IntegrationCardProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    setIsTesting(true);
    try {
      const result = await testIntegration(integration.id);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Connection Test Successful",
        description: `${getProviderName(integration.provider)} is working correctly`,
      });
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description:
          error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    } finally {
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
        title: "Integration Deleted",
        description: `${getProviderName(integration.provider)} has been removed`,
      });

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
      setShowDeleteDialog(false);
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">
              {getProviderIcon(integration.provider)}
            </span>
            <CardTitle className="text-lg">
              {getProviderName(integration.provider)}
            </CardTitle>
          </div>
          <Badge
            variant={
              integration.status === "connected" ? "default" : "destructive"
            }
          >
            {integration.status}
          </Badge>
        </div>
        <CardDescription>
          Connected on {new Date(integration.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Integration details */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Type:</span> {integration.type}
            </div>
            {integration.webhook_url && (
              <div className="text-sm">
                <span className="font-medium">Webhook:</span>
                <span className="ml-1 text-muted-foreground truncate block">
                  {integration.webhook_url}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? "Testing..." : "Test"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteDialog(true)}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogTrigger>
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
                  <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete Integration
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
