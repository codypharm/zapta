/**
 * Metric Card Component
 * Displays a key metric with value, percentage change, and enhanced visuals
 */

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon?: LucideIcon;
  description?: string;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'orange';
}

const VARIANT_STYLES = {
  default: {
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
};

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  variant = 'default',
}: MetricCardProps) {
  const styles = VARIANT_STYLES[variant];
  
  // Determine change indicator
  const getChangeColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getChangeBg = () => {
    if (change === undefined || change === 0) return "bg-muted/50";
    return change > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30";
  };

  const getChangeIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const ChangeIcon = getChangeIcon();
  const changeColor = getChangeColor();
  const changeBg = getChangeBg();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          {Icon && (
            <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${styles.iconColor}`} />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
        
        {/* Footer: Change + Description */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
          {change !== undefined ? (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeBg} ${changeColor}`}>
              <ChangeIcon className="h-3 w-3" />
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          ) : (
            <div />
          )}
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
