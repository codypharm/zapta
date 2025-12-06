/**
 * Agent Types Stats Component
 * Shows breakdown of Customer vs Business Assistants with tool usage
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Wrench } from "lucide-react";

interface AgentTypesStatsProps {
  metrics: {
    customerAssistants: number;
    businessAssistants: number;
    toolInvocations: number;
  };
}

export function AgentTypesStats({ metrics }: AgentTypesStatsProps) {
  const total = metrics.customerAssistants + metrics.businessAssistants;
  const customerPercent = total > 0 ? Math.round((metrics.customerAssistants / total) * 100) : 0;
  const businessPercent = total > 0 ? Math.round((metrics.businessAssistants / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Agent Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Progress Bar */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
              <div 
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${customerPercent}%` }}
              />
              <div 
                className="bg-purple-500 transition-all duration-500"
                style={{ width: `${businessPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Customer ({customerPercent}%)</span>
              <span>Business ({businessPercent}%)</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Customer Assistants */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold">{metrics.customerAssistants}</p>
              <p className="text-xs text-muted-foreground">Customer Assistants</p>
            </div>
          </div>

          {/* Business Assistants */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold">{metrics.businessAssistants}</p>
              <p className="text-xs text-muted-foreground">Business Assistants</p>
            </div>
          </div>

          {/* Tool Invocations */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
              <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold">{metrics.toolInvocations}</p>
              <p className="text-xs text-muted-foreground">Tool Invocations</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {total === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No agents created yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
