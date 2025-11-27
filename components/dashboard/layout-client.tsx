"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Bot,
  Plug,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Users,
  BarChart3,
  Crown,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import { OverLimitBanner } from "@/components/billing/over-limit-banner";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string } | null;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user plan
  useEffect(() => {
    const loadUserPlan = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', authUser.id)
          .single();
        
        if (profile) {
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('tenant_id', profile.tenant_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);
          
          const subscription = subscriptions?.[0];
          
          if (subscription) {
            setUserPlan(subscription.plan_id || 'free');
          } else {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('subscription_plan')
              .eq('id', profile.tenant_id)
              .single();
            
            if (tenant) {
              setUserPlan(tenant.subscription_plan || 'free');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user plan:', err);
      } finally {
        setLoadingPlan(false);
      }
    };
    
    if (mounted) {
      loadUserPlan();
    }
  }, [mounted]);

  const handleLogout = async () => {
    const { logout } = await import("@/lib/auth/actions");
    await logout();
  };

  // Don't render interactive elements until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen bg-muted/30">
        <div className="flex items-center justify-center w-full">
          <Image
            src="/assets/logo.png"
            alt="Loading"
            width={80}
            height={80}
            className="w-20 h-20 animate-pulse"
          />
        </div>
      </div>
    );
  }

  // Get user initials for avatar
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen bg-muted/30 relative">
      {/* Menu Toggle Button - Transforms between Hamburger and X */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-4 z-[200] flex items-center justify-center w-10 h-10 bg-white rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {sidebarOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setSidebarOpen(false)}
            >
              <Image
                src="/assets/logo.png"
                alt="Zapta"
                width={56}
                height={56}
                className="h-14 w-14"
              />
              <span className="text-2xl font-bold pt-4">Zapta</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg
                    transition-colors
                    ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                    {userInitials}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || "View profile"}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[200]">
                {/* Plan Badge */}
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 text-primary">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold capitalize">
                      {loadingPlan ? 'Loading...' : `${userPlan} Plan`}
                    </span>
                  </div>
                </div>
                
                {/* Billing/Upgrade Button */}
                {!loadingPlan && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing" className="font-medium">
                      <Zap className="w-4 h-4 mr-2" />
                      {userPlan === 'enterprise' ? 'Manage Billing' : 'Upgrade Plan'}
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-white px-4 sm:px-6 sticky top-0 z-[100] lg:relative">
          {/* Spacer for fixed hamburger button on mobile */}
          <div className="lg:hidden w-12" aria-hidden="true"></div>

          {/* Logo - Only on mobile - Centered */}
          <Link 
            href="/" 
            className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
            onClick={() => setSidebarOpen(false)}
          >
            <Image
              src="/assets/logo.png"
              alt="Zapta"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold leading-none pt-2">Zapta</span>
          </Link>

          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Could add notifications, search, etc here */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative z-0">
          <OverLimitBanner />
          {children}
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
