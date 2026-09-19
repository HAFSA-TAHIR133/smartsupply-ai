import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, glow = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-dark-border bg-dark-card/90 text-slate-100 shadow-xl backdrop-blur-xl transition-all duration-200",
      glow && "border-brand-500/30 shadow-glow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-base font-semibold leading-none tracking-tight text-white", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-xs text-slate-400 mt-1", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-2", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-5 pt-0 border-t border-dark-border/50 mt-4", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;