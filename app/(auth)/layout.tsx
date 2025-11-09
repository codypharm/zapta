/**
 * Auth Layout
 * Simple layout for authentication pages (login, signup)
 * No sidebar or navigation
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
