/**
 * Signup Form Component
 * Handles user registration and tenant creation
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrength } from "@/components/auth/password-strength";
import { PasswordInput } from "@/components/auth/password-input";
import { signup } from "@/lib/auth/actions";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Validate passwords match
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const result = await signup(formData);

      if (result.error) {
        setError(result.error);
      } else {
        // Show success message instead of redirecting
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // If signup was successful, show success message
  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Account created successfully!</p>
              <p>
                Please check your email inbox and click the confirmation link to
                verify your email address.
              </p>
              <p className="text-sm text-green-700">
                Don't see it? Check your spam folder.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Full name field */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="John Doe"
          required
          autoComplete="name"
          disabled={loading}
        />
      </div>

      {/* Organization name field */}
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          type="text"
          placeholder="Acme Inc"
          required
          disabled={loading}
        />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="••••••••••"
          required
          autoComplete="new-password"
          minLength={10}
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Must be at least 10 characters
        </p>

        {/* Password strength meter */}
        <PasswordStrength password={password} />
      </div>

      {/* Confirm Password field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          placeholder="••••••••••"
          required
          autoComplete="new-password"
          minLength={10}
          disabled={loading}
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full font-semibold"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Creating account...
          </span>
        ) : (
          "Create account →"
        )}
      </Button>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </a>
      </p>
    </form>
  );
}
