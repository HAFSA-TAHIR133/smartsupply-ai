import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "md", children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
      default: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/60 shadow-sm",
      primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm border border-indigo-500/40",
      gradient: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm border border-indigo-500/40",
      secondary: "bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white border border-zinc-800",
      outline: "border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white shadow-sm",
      ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850",
      danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-sm border border-rose-500/40",
      success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm border border-emerald-500/40",
      glow: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm border border-indigo-500/40 font-medium",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5 font-medium",
      md: "text-xs px-3.5 py-2 rounded-lg gap-2 font-medium",
      lg: "text-sm px-4.5 py-2.5 rounded-lg gap-2.5 font-medium",
      icon: "p-2 rounded-lg aspect-square",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
export default Button;