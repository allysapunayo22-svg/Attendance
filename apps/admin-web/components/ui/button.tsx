import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", asChild, children, ...props }, ref) => {
  const variants = {
    default: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm active:scale-[0.99]",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-[0.99]",
    destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.99]",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-xs",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };

  const classes = cn(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className
  );

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      className: cn(classes, (children.props as { className?: string })?.className)
    });
  }

  return (
    <button
      ref={ref}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";
