/**
 * Activity Feed Component
 * Shows recent activity on the dashboard
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Users, Clock } from "lucide-react";
import { Activity } from "@/lib/analytics/actions";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "lead":
        return Users;
      case "conversation":
        return MessageSquare;
      case "agent":
        return Bot;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "lead":
        return "text-green-600 bg-green-50";
      case "conversation":
        return "text-blue-600 bg-blue-50";
      case "agent":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getActivityLink = (activity: Activity) => {
    switch (activity.type) {
      case "lead":
        return `/leads/${activity.id}`;
      case "conversation":
        return `/conversations/${activity.id}`;
      case "agent":
        return `/agents/${activity.id}`;
      default:
        return "#";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm mt-1">Activity will appear here as you use your agents</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const color = getActivityColor(activity.type);
              const link = getActivityLink(activity);

              return (
                <Link
                  key={`${activity.type}-${activity.id}`}
                  href={link}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${color} flex-shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
