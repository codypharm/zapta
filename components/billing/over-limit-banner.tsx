/**
 * Over-Limit Warning Banner
 * Shows when user has resources exceeding their current plan
 */

"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface UsageWarning {
  type: 'agents' | 'storage';
  current: number;
  limit: number;
  planId: string;
}

export function OverLimitBanner() {
  const [warnings, setWarnings] = useState<UsageWarning[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOverLimits();
  }, []);

  async function checkOverLimits() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Get subscription info
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      const subscription = subscriptions?.[0];
      const planId = subscription?.plan_id || 'free';

      // Get plan limits
      const { getPlanLimits } = await import("@/lib/billing/plans");
      const limits = getPlanLimits(planId);

      const foundWarnings: UsageWarning[] = [];

      // Check agent count
      const { count: agentCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'active');

      if (agentCount && limits.agents !== -1 && agentCount > limits.agents) {
        foundWarnings.push({
          type: 'agents',
          current: agentCount,
          limit: limits.agents,
          planId,
        });
      }

      // Check storage
      const { data: tenant } = await supabase
        .from('tenants')
        .select('usage_storage_bytes')
        .eq('id', profile.tenant_id)
        .single();

      if (tenant) {
        const storageMB = Math.round((tenant.usage_storage_bytes || 0) / (1024 * 1024));
        if (storageMB > limits.storage_mb) {
          foundWarnings.push({
            type: 'storage',
            current: storageMB,
            limit: limits.storage_mb,
            planId,
          });
        }
      }

      setWarnings(foundWarnings);
    } catch (error) {
      console.error('Failed to check limits:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || warnings.length === 0 || dismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <AlertDescription>
            <p className="font-semibold text-orange-900 mb-2">
              You're using more resources than your current plan allows
            </p>
            <ul className="space-y-1 text-sm text-orange-800">
              {warnings.map((warning, i) => (
                <li key={i}>
                  {warning.type === 'agents' ? (
                    <>
                      • You have <strong>{warning.current} agents</strong> but your{' '}
                      <span className="capitalize">{warning.planId}</span> plan allows <strong>{warning.limit}</strong>.
                      You can't create new agents until you upgrade or delete some.
                    </>
                  ) : (
                    <>
                      • You're using <strong>{warning.current} MB</strong> of storage but your{' '}
                      <span className="capitalize">{warning.planId}</span> plan allows <strong>{warning.limit} MB</strong>.
                      You can't upload new files until you upgrade or delete some.
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-3">
              <Button asChild size="sm" className="h-8">
                <Link href="/settings/billing">
                  Upgrade Plan
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href={warnings[0].type === 'agents' ? '/agents' : '/knowledge'}>
                  Manage {warnings[0].type === 'agents' ? 'Agents' : 'Files'}
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-orange-600 hover:text-orange-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
