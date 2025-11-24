/**
 * Marketing Header Component - Client
 * Shared header for public facing pages (landing, pricing, etc)
 */

"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface MarketingHeaderProps {
  isAuthenticated: boolean;
}

export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  return (
    <header className="fixed top-0 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Zapta</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/#features" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/pricing" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/#how-it-works" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              // Authenticated user - show Dashboard link
              <Button asChild size="sm" className="font-semibold">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              // Not authenticated - show Sign In and Get Started
              <>
                <Button asChild variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="font-semibold">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
