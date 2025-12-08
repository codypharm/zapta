/**
 * Reset Password Page
 * Set new password after clicking email link
 */

import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password - Zapta",
  description: "Set your new password",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        {/* Reset password form */}
        <ResetPasswordForm />
      </div>
    </div>
  );
}
