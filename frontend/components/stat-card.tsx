import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  emphasis?: boolean;
}

export function StatCard({ label, value, hint, emphasis }: StatCardProps) {
  return (
    <div className="rounded-card border border-outline bg-surface p-4">
      <Text variant="overline">{label}</Text>
      <p
        className={cn(
          "mt-1 font-bold text-foreground",
          emphasis ? "text-3xl" : "text-xl",
        )}
      >
        {value}
      </p>
      {hint ? (
        <Text variant="caption" className="mt-0.5">
          {hint}
        </Text>
      ) : null}
    </div>
  );
}
