import type { InputHTMLAttributes, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const input = cva(
  "w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20",
  {
    variants: {
      invalid: {
        true: "border-danger",
        false: "border-outline-strong",
      },
    },
    defaultVariants: { invalid: false },
  },
);

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().split(" ").join("-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(input({ invalid: !!error }), className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
