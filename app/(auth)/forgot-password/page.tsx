/**
 * Forgot Password Page
 * Request password reset email
 */

import { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password - Zapta",
  description: "Reset your Zapta account password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {/* Forgot password form */}
        <ForgotPasswordForm />

        {/* Back to login */}
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
