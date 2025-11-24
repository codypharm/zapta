/**
 * Manage Subscription Button
 * Opens Stripe Customer Portal for subscription management
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createPortalSession } from "@/lib/billing/actions";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    
    const { url, error } = await createPortalSession();
    
    if (error) {
      alert(error);
      setLoading(false);
      return;
    }

    if (url) {
      window.location.href = url;
    }
  }

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        'Manage Subscription'
      )}
    </Button>
  );
}
