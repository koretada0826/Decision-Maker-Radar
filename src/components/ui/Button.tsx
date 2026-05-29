"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900 disabled:bg-slate-300",
  secondary:
    "bg-white text-slate-900 border border-slate-900 hover:bg-slate-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
  outline: "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center font-bold tracking-wide transition-colors select-none disabled:opacity-60 disabled:cursor-not-allowed",
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
