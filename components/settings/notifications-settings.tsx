"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Mail, Save } from "lucide-react";
import { updateNotificationPreferences, type NotificationPreferences } from "@/lib/settings/actions";
import { useRouter } from "next/navigation";

interface NotificationsSettingsProps {
  preferences: NotificationPreferences;
}

export function NotificationsSettings({ preferences: initialPreferences }: NotificationsSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateNotificationPreferences(preferences);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Notification preferences updated successfully");
      router.refresh();
    }
    setIsLoading(false);
  };

  const updateEmailPreference = (key: keyof NotificationPreferences["email"], value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: value,
      },
    }));
  };

  const updateInAppPreference = (key: keyof NotificationPreferences["inApp"], value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      inApp: {
        ...prev.inApp,
        [key]: value,
      },
    }));
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <CardDescription>
              Choose which emails you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="newLeads">New Leads</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a new lead is captured
                </p>
              </div>
              <Switch
                id="newLeads"
                checked={preferences.email.newLeads}
                onCheckedChange={(checked) => updateEmailPreference("newLeads", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="newConversations">New Conversations</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a new conversation starts
                </p>
              </div>
              <Switch
                id="newConversations"
                checked={preferences.email.newConversations}
                onCheckedChange={(checked) => updateEmailPreference("newConversations", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dailySummary">Daily Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of activity
                </p>
              </div>
              <Switch
                id="dailySummary"
                checked={preferences.email.dailySummary}
                onCheckedChange={(checked) => updateEmailPreference("dailySummary", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklySummary">Weekly Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of activity
                </p>
              </div>
              <Switch
                id="weeklySummary"
                checked={preferences.email.weeklySummary}
                onCheckedChange={(checked) => updateEmailPreference("weeklySummary", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle>In-App Notifications</CardTitle>
            </div>
            <CardDescription>
              Manage your in-app notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="inAppEnabled">Enable In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the dashboard
                </p>
              </div>
              <Switch
                id="inAppEnabled"
                checked={preferences.inApp.enabled}
                onCheckedChange={(checked) => updateInAppPreference("enabled", checked)}
              />
            </div>

            {!preferences.inApp.enabled && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  In-app notifications are currently disabled. Enable them to see real-time updates in your dashboard.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </div>
  );
}
