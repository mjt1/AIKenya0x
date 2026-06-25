import { initials } from "@/lib/format";

export interface UserChipProps {
  name?: string;
  county?: string;
  onLogout: () => void;
}

/** Agent identity + sign-out, shown at the foot of the sidebar. */
export function UserChip({ name, county, onLogout }: UserChipProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
        {name ? initials(name) : "A"}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-white">{name ?? "Agent"}</p>
        {county ? (
          <p className="truncate text-xs text-white/55">{county}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onLogout}
        title="Sign out"
        className="rounded-md px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
