"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/queries/use-me";
import { useLogout } from "@/hooks/mutations/use-logout";
import { Brand } from "@/components/brand";
import { UserChip } from "@/components/user-chip";
import { SyncIndicator } from "@/components/pwa/sync-indicator";

interface NavItem {
  label: string;
  href: string;
  ready?: boolean;
}

// Wired: Queue, Log Visit, Farmers, Advisory, Caseload Map, Profile.
const NAV: NavItem[] = [
  { label: "Daily Queue", href: "/queue", ready: true },
  { label: "Log Visit", href: "/capture", ready: true },
  { label: "Farmers", href: "/farmers", ready: true },
  { label: "Advisory", href: "/advisory", ready: true },
  { label: "Caseload Map", href: "/map", ready: true },
  { label: "Profile", href: "/profile", ready: true },
];

// Admin-only section (shown when the signed-in agent has the admin role).
const ADMIN_NAV: NavItem[] = [
  { label: "Knowledge base", href: "/admin/knowledge", ready: true },
  { label: "Agents", href: "/admin/agents", ready: true },
  { label: "Analytics", href: "/admin/analytics", ready: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();
  const agent = me.data?.agent;
  const isAdmin = agent?.role === "admin";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden bg-primary-dark md:flex md:w-64 md:shrink-0 md:flex-col">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-white/45"
                >
                  {item.label}
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    Soon
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {isAdmin ? (
            <div className="pt-4">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Admin
              </p>
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
        <div className="border-t border-white/10 p-3">
          <UserChip
            name={agent?.name}
            county={agent?.county}
            onLogout={logout}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between bg-primary-dark px-4 py-3 md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <button
            type="button"
            onClick={logout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 hidden justify-end md:flex empty:hidden">
            <SyncIndicator />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
