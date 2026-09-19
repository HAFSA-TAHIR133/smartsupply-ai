import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "md", children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
      default: "bg-brand-600 text-white hover:bg-brand-500 shadow-md hover:shadow-glow-sm border border-brand-500/30",
      primary: "bg-gradient-to-r from-brand-700 to-brand-600 text-white hover:from-brand-600 hover:to-brand-500 shadow-glow border border-brand-400/30",
      secondary: "bg-dark-card text-brand-200 hover:bg-dark-cardHover hover:text-white border border-dark-border",
      outline: "border border-dark-borderLight bg-dark-bg/60 text-slate-200 hover:bg-brand-950/40 hover:border-brand-500/50 hover:text-white",
      ghost: "text-slate-400 hover:text-white hover:bg-brand-950/40",
      danger: "bg-rose-600/90 text-white hover:bg-rose-500 shadow-sm border border-rose-500/40",
      success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm border border-emerald-500/40",
      glow: "bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-glow hover:shadow-glow-lg border border-brand-400/40 font-semibold",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
      md: "text-sm px-4 py-2 rounded-lg gap-2",
      lg: "text-base px-5 py-2.5 rounded-xl gap-2.5",
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