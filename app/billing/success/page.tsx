/**
 * Checkout Success Page
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground">
              Your subscription has been activated. Welcome to Zapta!
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings/billing">View Billing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
