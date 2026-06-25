/** Suluhu wordmark + mark. Sized for the dark sidebar / mobile header. */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-base font-bold text-on-primary-container">
        S
      </span>
      <div className="leading-tight">
        <p className="text-base font-bold tracking-tight text-white">Suluhu</p>
        <p className="text-[11px] text-white/60">Field Intelligence</p>
      </div>
    </div>
  );
}
