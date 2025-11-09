/**
 * Home Page
 * Landing page with HubSpot-inspired minimalist design
 */

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Hero section */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
            Create AI agents without the
            <span className="text-primary"> technical complexity</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build powerful AI agents with natural language. No coding required.
            Just describe what you want, and we'll handle the rest.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/signup">
              Get Started for Free →
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
          <div className="space-y-2">
            <div className="text-2xl">💬</div>
            <h3 className="font-semibold text-lg">Natural Language</h3>
            <p className="text-sm text-muted-foreground">
              Just describe your agent in plain English. No complex workflows or code.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🔌</div>
            <h3 className="font-semibold text-lg">Ready Integrations</h3>
            <p className="text-sm text-muted-foreground">
              Connect to Email, Slack, CRM, and more with one click.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📊</div>
            <h3 className="font-semibold text-lg">Real-time Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your agents' performance with beautiful dashboards.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
