"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building, Bell, AlertTriangle } from "lucide-react";
import { ProfileSettings } from "./profile-settings";
import { OrganizationSettings } from "./organization-settings";
import { NotificationsSettings } from "./notifications-settings";
import { DangerZoneSettings } from "./danger-zone-settings";

interface SettingsClientProps {
  profile: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    created_at: string;
    notification_preferences: any;
  };
  organization: {
    id: string;
    name: string;
    created_at: string;
  };
}

export function SettingsClient({ profile, organization }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("profile");

  // Ensure notification preferences have default values
  const notificationPreferences = profile.notification_preferences || {
    email: {
      newLeads: true,
      newConversations: true,
      dailySummary: false,
      weeklySummary: true,
    },
    inApp: {
      enabled: true,
    },
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and organization settings
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Organization</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Danger Zone</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings profile={profile} />
          </TabsContent>

          <TabsContent value="organization" className="mt-6">
            <OrganizationSettings
              organization={organization}
              userRole={profile.role}
            />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationsSettings preferences={notificationPreferences} />
          </TabsContent>

          <TabsContent value="danger" className="mt-6">
            <DangerZoneSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
