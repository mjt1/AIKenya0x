import type { SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().split(" ").join("-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={fieldId}
        className={cn(
          "w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
          error ? "border-danger" : "border-outline-strong",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
