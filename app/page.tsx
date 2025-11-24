/**
 * Landing Page
 * Clean, professional design with simple colors
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Sparkles,
  Zap,
  Brain,
  Shield,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Check,
  Bot,
  Code,
  CheckCircle,
  Users,
  Mail,
  Calendar,
  Webhook,
  TrendingUp,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative">
      {/* Header/Navbar */}
      <MarketingHeader isAuthenticated={!!user} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center hero-bg pt-16">
        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                AI-powered automation platform
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Create AI agents
            <br />
            <span className="text-primary">without complexity</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Build powerful AI agents with natural language. No coding required.
            Just describe what you want, and we'll handle the rest.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button
              asChild
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all text-lg px-8 py-6 rounded-xl font-semibold"
            >
              <Link href="/signup">
                Get Started for Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 rounded-xl font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your AI control center
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Monitor, manage, and deploy AI agents from one beautiful dashboard
            </p>
          </motion.div>

          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Browser mockup */}
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-white rounded px-3 py-1 text-xs text-gray-500 max-w-xs">
                  app.zapta.io/dashboard
                </div>
              </div>
            </div>
            {/* Placeholder for dashboard screenshot */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-12 min-h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-24 h-24 text-primary mx-auto mb-4" />
                <p className="text-2xl font-semibold text-gray-700">
                  Dashboard Preview
                </p>
                <p className="text-gray-500 mt-2">
                  Real screenshots coming soon
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: MessageSquare, label: "Real-time Chat" },
              { icon: BarChart3, label: "Analytics" },
              { icon: Zap, label: "Instant Deploy" },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need to automate
            </h2>
            <p className="text-xl text-muted-foreground">
              Powerful features that make AI automation simple
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Natural Language",
                description:
                  "Just describe your agent in plain English. No complex workflows or code required.",
              },
              {
                icon: Zap,
                title: "Ready Integrations",
                description:
                  "Connect to Email, Slack, CRM, and more with one click. Pre-built connectors for popular tools.",
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description:
                  "Monitor your agents' performance with beautiful dashboards and detailed insights.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description:
                  "Bank-level encryption, SOC 2 compliance, and role-based access control built-in.",
              },
              {
                icon: MessageSquare,
                title: "Conversational AI",
                description:
                  "Agents that understand context and learn from every interaction with your customers.",
              },
              {
                icon: Sparkles,
                title: "Multi-model Support",
                description:
                  "Use Claude, GPT-4, or any model you prefer. Switch between models instantly.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="p-8 rounded-2xl bg-white border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Get started in minutes
            </h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to your first AI agent
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Describe your agent",
                description:
                  "Tell us what you want your agent to do in plain English. No technical knowledge needed.",
              },
              {
                step: "02",
                title: "Connect your tools",
                description:
                  "Link your email, Slack, CRM, or any other tool with a single click.",
              },
              {
                step: "03",
                title: "Deploy & monitor",
                description:
                  "Your agent starts working immediately. Watch it handle tasks in real-time.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white font-bold text-2xl mb-6">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-lg text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to automate your workflow?
            </h2>
            <p className="text-xl text-white/90 mb-12">
              Join thousands of teams already using Zapta to save time and increase productivity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl text-lg px-8 py-6 rounded-xl font-semibold"
              >
                <Link href="/signup">
                  Start Building for Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Free forever plan</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground">
            <p className="text-2xl font-bold text-foreground mb-2">Zapta</p>
            <p>© 2025 Zapta. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
