import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function buttonStyles({
  variant = "primary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[linear-gradient(135deg,var(--primary)_0%,#c91726_100%)] text-[var(--primary-ink)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,70,85,0.24)]",
    secondary:
      "bg-[rgba(255,70,85,0.08)] text-white ring-1 ring-[rgba(255,70,85,0.22)] hover:bg-[rgba(255,70,85,0.14)] hover:-translate-y-0.5",
    ghost:
      "bg-transparent text-white ring-1 ring-[rgba(255,70,85,0.16)] hover:bg-[rgba(255,70,85,0.08)]",
    danger:
      "bg-[var(--danger)] text-white hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,92,101,0.2)]",
  };

  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition duration-200",
    variants[variant],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button ref={ref} className={buttonStyles({ variant, className })} {...props} />
  ),
);

Button.displayName = "Button";
