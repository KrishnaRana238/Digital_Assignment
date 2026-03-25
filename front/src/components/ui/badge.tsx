import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "secondary" | "accent";
}) {
  const tones = {
    default: "text-[var(--secondary)] bg-[rgba(255,70,85,0.09)] border-[rgba(255,70,85,0.18)]",
    secondary: "text-[#ffc3c7] bg-[rgba(255,139,148,0.08)] border-[rgba(255,139,148,0.18)]",
    accent: "text-[var(--accent)] bg-[rgba(255,177,111,0.08)] border-[rgba(255,177,111,0.18)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
