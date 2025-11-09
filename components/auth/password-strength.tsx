/**
 * Password Strength Meter
 * Visual feedback for password strength without enforcing complexity
 */

"use client";

import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = "weak" | "medium" | "strong";

interface StrengthInfo {
  level: StrengthLevel;
  label: string;
  color: string;
  barColor: string;
  width: string;
}

/**
 * Calculate password strength based on length and variety
 * Does not enforce rules, just provides feedback
 */
function calculateStrength(password: string): StrengthInfo {
  if (!password || password.length === 0) {
    return {
      level: "weak",
      label: "",
      color: "",
      barColor: "",
      width: "0%",
    };
  }

  let score = 0;

  // Length scoring (most important)
  if (password.length >= 10) score += 2;
  if (password.length >= 14) score += 1;
  if (password.length >= 18) score += 1;

  // Variety scoring (secondary)
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special chars

  // Common patterns penalty
  const commonPatterns = [
    /^password/i,
    /^123+/,
    /^qwerty/i,
    /^abc+/i,
  ];
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score = Math.max(0, score - 2);
  }

  // Determine strength level
  if (score <= 3) {
    return {
      level: "weak",
      label: "Weak",
      color: "text-red-600",
      barColor: "bg-red-500",
      width: "33%",
    };
  } else if (score <= 5) {
    return {
      level: "medium",
      label: "Medium",
      color: "text-orange-600",
      barColor: "bg-orange-500",
      width: "66%",
    };
  } else {
    return {
      level: "strong",
      label: "Strong",
      color: "text-green-600",
      barColor: "bg-green-500",
      width: "100%",
    };
  }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  // Don't show anything if password is empty
  if (!password || password.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.barColor}`}
          style={{ width: strength.width }}
        />
      </div>

      {/* Strength label */}
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${strength.color}`}>
          {strength.label}
        </p>

        {/* Helpful tips */}
        {strength.level === "weak" && password.length >= 10 && (
          <p className="text-xs text-muted-foreground">
            Try adding numbers or symbols
          </p>
        )}
        {strength.level === "weak" && password.length < 10 && (
          <p className="text-xs text-muted-foreground">
            Use at least 10 characters
          </p>
        )}
        {strength.level === "medium" && (
          <p className="text-xs text-muted-foreground">
            Add more variety for better security
          </p>
        )}
        {strength.level === "strong" && (
          <p className="text-xs text-muted-foreground">
            Great password! 🔒
          </p>
        )}
      </div>
    </div>
  );
}
