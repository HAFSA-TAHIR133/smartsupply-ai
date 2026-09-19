import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, label, ...props }, ref) => {
  if (label) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-300 block">{label}</label>
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-dark-border bg-dark-bg/80 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-dark-border bg-dark-bg/80 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
export default Input;
