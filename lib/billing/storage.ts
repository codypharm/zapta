/**
 * Storage Usage Tracking
 * Track and enforce storage limits for file uploads
 */

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getPlanLimits } from "./plans";

/**
 * Check if tenant can upload more files
 */
export async function checkStorageLimit(
  tenantId: string,
  fileSizeBytes: number
): Promise<{
  allowed: boolean;
  currentMB: number;
  limitMB: number;
  planId: string;
}> {
  const supabase = await createServerClient();

  // Get tenant's usage data
  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_plan, usage_storage_bytes")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Check subscriptions table first (source of truth for paid plans)
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const subscription = subscriptions?.[0];
  
  // Use subscription plan_id if available, fallback to tenants.subscription_plan
  const planId = subscription?.plan_id || tenant.subscription_plan || "free";
  const planLimits = getPlanLimits(planId);
  
  const currentBytes = tenant.usage_storage_bytes || 0;
  const currentMB = Math.round(currentBytes / (1024 * 1024));
  const limitMB = planLimits.storage_mb;
  
  // Check if adding this file would exceed limit
  const newTotalBytes = currentBytes + fileSizeBytes;
  const newTotalMB = newTotalBytes / (1024 * 1024);
  
  const allowed = newTotalMB <= limitMB;

  return {
    allowed,
    currentMB,
    limitMB,
    planId,
  };
}

/**
 * Increment storage usage
 */
export async function incrementStorageUsage(
  tenantId: string,
  fileSizeBytes: number
): Promise<void> {
  const supabase = await createServerClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("usage_storage_bytes")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const newUsage = (tenant.usage_storage_bytes || 0) + fileSizeBytes;

  await supabase
    .from("tenants")
    .update({ usage_storage_bytes: newUsage })
    .eq("id", tenantId);
}

/**
 * Decrement storage usage (when file is deleted)
 */
export async function decrementStorageUsage(
  tenantId: string,
  fileSizeBytes: number
): Promise<void> {
  const supabase = await createServerClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("usage_storage_bytes")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const newUsage = Math.max(0, (tenant.usage_storage_bytes || 0) - fileSizeBytes);

  await supabase
    .from("tenants")
    .update({ usage_storage_bytes: newUsage })
    .eq("id", tenantId);
}
