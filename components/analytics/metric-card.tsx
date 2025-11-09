/**
 * Metric Card Component
 * Displays a key metric with value and percentage change
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon?: LucideIcon;
  description?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
}: MetricCardProps) {
  // Determine change indicator
  const getChangeColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-600" : "text-red-600";
  };

  const getChangeIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? ArrowUp : ArrowDown;
  };

  const ChangeIcon = getChangeIcon();
  const changeColor = getChangeColor();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${changeColor} mt-1`}>
            <ChangeIcon className="h-3 w-3 mr-1" />
            <span>
              {Math.abs(change)}% from last period
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
