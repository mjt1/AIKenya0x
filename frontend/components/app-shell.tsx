"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/queries/use-me";
import { useQueue } from "@/hooks/queries/use-queue";
import { useLogout } from "@/hooks/mutations/use-logout";
import { Brand } from "@/components/brand";
import { UserChip } from "@/components/user-chip";
import { SyncIndicator } from "@/components/pwa/sync-indicator";

interface NavItem {
  label: string;
  href: string;
  /** Show the live pending-queue count as a badge. */
  queueBadge?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Grouped to mirror the dashboard layout, wired to our real routes.
const SECTIONS: NavSection[] = [
  {
    label: "Core loop",
    items: [
      { label: "Daily Queue", href: "/queue", queueBadge: true },
      { label: "Log Visit", href: "/capture" },
    ],
  },
  {
    label: "Intelligence",
    items: [{ label: "Ask Suluhu", href: "/advisory" }],
  },
  {
    label: "Caseload",
    items: [
      { label: "Farmers", href: "/farmers" },
      { label: "Caseload Map", href: "/map" },
    ],
  },
  { label: "Account", items: [{ label: "Profile", href: "/profile" }] },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Knowledge base", href: "/admin/knowledge" },
  { label: "Agents", href: "/admin/agents" },
  { label: "Analytics", href: "/admin/analytics" },
];

function initialsOf(name?: string): string {
  if (!name) return "--";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "--";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const me = useMe();
  const queue = useQueue();
  const logout = useLogout();
  const agent = me.data?.agent;
  const isAdmin = agent?.role === "admin";
  const caseloadSize = me.data?.caseloadSize ?? 0;
  const queueCount = queue.data?.length ?? 0;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navLink = (item: NavItem) => {
    const active = isActive(item.href);
    const badge = item.queueBadge && queueCount > 0 ? queueCount : null;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 border-l-2 px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "border-on-primary bg-white/15 text-white"
            : "border-transparent text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <span className="truncate">{item.label}</span>
        {badge !== null ? (
          <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-on-danger">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden bg-primary-dark md:flex md:w-64 md:shrink-0 md:flex-col">
        <div className="px-5 py-5">
          <Brand />
        </div>

        {/* Agent card */}
        <div className="mx-3 flex items-center gap-2.5 rounded-md bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {initialsOf(agent?.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-white">
              {agent?.name ?? "\u2014"}
            </div>
            <div className="truncate text-[11px] text-white/45">
              {agent?.county ? `${agent.county} \u00b7 ` : ""}
              {caseloadSize} farm{caseloadSize === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                {section.label}
              </p>
              {section.items.map(navLink)}
            </div>
          ))}

          {isAdmin ? (
            <div>
              <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Admin
              </p>
              {ADMIN_NAV.map(navLink)}
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

      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
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
