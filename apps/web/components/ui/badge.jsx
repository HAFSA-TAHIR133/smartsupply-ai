import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-brand-600/20 text-brand-300 border-brand-500/30",
    purple: "bg-violet-600/20 text-violet-300 border-violet-500/40",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    glow: "bg-brand-600/30 text-brand-200 border-brand-400/50 shadow-glow-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export default Badge;
