import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    purple: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    secondary: "bg-zinc-800 text-zinc-300 border-zinc-700/60",
    glow: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-normal whitespace-nowrap transition-colors",
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
