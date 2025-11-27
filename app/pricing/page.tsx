/**
 * Public Pricing Page
 * Displays all subscription plans for prospective customers
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { PLAN_LIMITS, PLAN_PRICES, PLAN_NAMES } from "@/lib/billing/plans";
import { MarketingHeader } from "@/components/marketing/header";
import { createServerClient } from "@/lib/supabase/server";

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out Zapta',
    features: [
      '1 AI agent',
      '100 messages/month',
      'Gemini Flash model only',
      'Email integration (10/mo)',
      '10 MB storage',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/signup',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    description: 'For solo entrepreneurs',
    features: [
      '3 AI agents',
      '1,000 messages/month',
      'Gemini + GPT-3.5 models',
      'Email + SMS + Calendar',
      '100 emails, 20 SMS/mo',
      '100 MB storage',
      'Email support',
    ],
    cta: 'Get Started',
    href: '/signup?plan=starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'For growing businesses',
    featured: true,
    features: [
      '10 AI agents',
      '5,000 messages/month',
      'All models inc. GPT-4.5',
      'Starter + HubSpot + Webhooks',
      '500 emails, 100 SMS/mo',
      '1 GB storage',
      'Priority support',
    ],
    cta: 'Get Started',
    href: '/signup?plan=pro',
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    description: 'For mid-size companies',
    features: [
      '50 AI agents',
      '25,000 messages/month',
      'All models + GPT-5 access',
      'Pro integrations + Advanced webhooks',
      '2,000 emails, 500 SMS/mo',
      '5 GB storage',
      'Priority email support',
    ],
    cta: 'Get Started',
    href: '/signup?plan=business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    description: 'For large organizations',
    features: [
      'Unlimited AI agents',
      '100,000 messages/month',
      'All models inc. GPT-5 + Custom fine-tuning',
      'All integrations + Custom development',
      'Unlimited emails & SMS',
      '50 GB storage',
      '99.9% SLA guarantee',
      'Dedicated support manager',
    ],
    cta: 'Contact Sales',
    href: '/contact',
  },
];

export default async function PricingPage() {
  // Check if user is authenticated
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <MarketingHeader isAuthenticated={!!user} />
      
      {/* Main Content */}
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 text-center pt-20 sm:pt-24 md:pt-28">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Choose the plan that's right for you. Start with the free plan and upgrade anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.featured
                    ? 'border-primary shadow-lg sm:scale-105'
                    : 'border-border'
                }`}
              >
                {plan.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm sm:text-base">{plan.description}</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold">${plan.price}</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <ul className="space-y-2 sm:space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-4 sm:mt-6" variant={plan.featured ? 'default' : 'outline'}>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Can I change plans later?</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">What payment methods do you accept?</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Can I try before paying?</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Yes! Our Free plan is available forever with no credit card required. You can upgrade to a paid plan anytime to unlock more features and higher limits.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">What happens if I exceed my message limit?</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                We'll send you a notification when you reach 80% of your limit. If you exceed your limit, you'll be prompted to upgrade to continue using your agents.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-base sm:text-lg">Can I cancel anytime?</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using Zapta to automate their workflows
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/signup">Start Free Trial →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
