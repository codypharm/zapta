/**
 * Upgrade Button Component
 * Opens modal to select and subscribe to a plan
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/billing/actions";
import { useRouter } from "next/navigation";

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    features: ['3 agents', '1K messages/mo', 'Email + SMS'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    popular: true,
    features: ['10 agents', '5K messages/mo', 'All models', 'All integrations'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    features: ['50 agents', '25K messages/mo', 'Priority support', 'Slack'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    features: ['Unlimited agents', '100K messages/mo', 'SSO', 'White-label'],
  },
];

export function UpgradeButton({ currentPlan }: { currentPlan: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleUpgrade(planId: string) {
    setLoading(planId);
    
    const { url, error } = await createCheckoutSession(planId);
    
    if (error) {
      alert(error);
      setLoading(null);
      return;
    }

    if (url) {
      window.location.href = url;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upgrade Plan</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select a plan to unlock more features and higher limits
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.popular ? 'border-primary' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  Popular
                </div>
              )}
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={currentPlan === plan.id || loading !== null}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : currentPlan === plan.id ? (
                    'Current Plan'
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
