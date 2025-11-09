/**
 * Authentication Server Actions
 * Handles login, signup, and logout operations
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Sign up a new user and create their tenant/organization
 *
 * @param formData - Form data containing email, password, fullName, organizationName
 * @returns Object with success status or error message
 */
export async function signup(formData: FormData) {
  const supabase = await createServerClient();

  // Extract form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const organizationName = formData.get("organizationName") as string;

  // Validate inputs
  if (!email || !password || !fullName || !organizationName) {
    return { error: "All fields are required" };
  }

  if (password.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }

  // Create slug from organization name (lowercase, replace spaces with hyphens)
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    // Step 1: Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Failed to create user" };
    }

    // Step 2 & 3: Create tenant and profile using service role (bypasses RLS)
    // This is necessary because RLS policies can't be evaluated until profile exists
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create tenant (organization)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: organizationName,
        slug,
        plan: "free", // Default to free plan
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      return { error: "Failed to create organization" };
    }

    // Create user profile linked to tenant
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email,
      full_name: fullName,
      role: "owner", // First user is the owner
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { error: "Failed to create user profile" };
    }

    return { success: true };
  } catch (error) {
    console.error("Signup error:", error);
    return { error: "An unexpected error occurred during signup" };
  }
}

/**
 * Log in an existing user
 *
 * @param formData - Form data containing email and password
 * @returns Object with success status or error message
 */
export async function login(formData: FormData) {
  const supabase = await createServerClient();

  // Extract form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validate inputs
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    // Attempt to sign in
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: "Invalid email or password" };
    }

    // Revalidate and redirect
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An unexpected error occurred during login" };
  }
}

/**
 * Log out the current user
 */
export async function logout() {
  const supabase = await createServerClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
