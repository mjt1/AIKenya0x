import type { ElementType, HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const text = cva("", {
  variants: {
    variant: {
      h1: "text-3xl font-bold tracking-tight text-foreground",
      h2: "text-2xl font-bold tracking-tight text-foreground",
      h3: "text-lg font-semibold text-foreground",
      body: "text-sm text-foreground",
      muted: "text-sm text-muted",
      label: "text-sm font-medium text-foreground",
      caption: "text-xs text-muted",
      overline: "text-xs font-semibold uppercase tracking-wide text-faint",
    },
  },
  defaultVariants: { variant: "body" },
});

type TextVariant = NonNullable<VariantProps<typeof text>["variant"]>;

const TAG: Record<TextVariant, ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  muted: "p",
  label: "span",
  caption: "p",
  overline: "p",
};

export interface TextProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof text> {
  as?: ElementType;
}

export function Text({ variant, as, className, ...props }: TextProps) {
  const Tag = as ?? TAG[variant ?? "body"];
  return <Tag className={cn(text({ variant }), className)} {...props} />;
}
