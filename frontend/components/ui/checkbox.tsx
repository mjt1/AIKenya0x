import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, id, className, ...props }: CheckboxProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().split(" ").join("-");
  return (
    <label
      htmlFor={inputId}
      className="flex items-center gap-2 text-sm text-foreground"
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-outline-strong text-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
        {...props}
      />
      {label}
    </label>
  );
}
