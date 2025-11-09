/**
 * Top Agents Table Component
 * Shows top performing agents by conversation count
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Users } from "lucide-react";

interface TopAgent {
  id: string;
  name: string;
  type: string;
  conversationCount: number;
  leadCount: number;
}

interface TopAgentsTableProps {
  agents: TopAgent[];
}

export function TopAgentsTable({ agents }: TopAgentsTableProps) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      support: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      automation: "bg-purple-100 text-purple-800",
      analytics: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Agents</CardTitle>
        <CardDescription>
          Agents ranked by conversation and lead activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No agent activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{agent.name}</h4>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getTypeColor(agent.type)}`}
                      >
                        {agent.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{agent.conversationCount} conversations</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{agent.leadCount} leads</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
