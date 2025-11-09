"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Save, Calendar } from "lucide-react";
import { updateOrganization } from "@/lib/settings/actions";
import { useRouter } from "next/navigation";

interface OrganizationSettingsProps {
  organization: {
    id: string;
    name: string;
    created_at: string;
  };
  userRole: string;
}

export function OrganizationSettings({ organization, userRole }: OrganizationSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState(organization.name);

  const canEdit = userRole === "owner" || userRole === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateOrganization({ name });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Organization settings updated successfully");
      router.refresh();
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Organization Information */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Manage your organization settings and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="orgName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your organization name"
                  className="pl-10"
                  disabled={!canEdit}
                />
              </div>
              {!canEdit && (
                <p className="text-xs text-muted-foreground">
                  Only owners and admins can update organization settings
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Organization ID</Label>
              <div className="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {organization.id}
              </div>
              <p className="text-xs text-muted-foreground">
                Use this ID for API integrations and webhooks
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created
              </Label>
              <p className="text-sm text-muted-foreground">
                {formatDate(organization.created_at)}
              </p>
            </div>

            {canEdit && (
              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Billing Section - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Building className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Billing Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We're working on adding billing and subscription management.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
              Currently on Free Plan
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
