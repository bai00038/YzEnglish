import { Link } from "react-router";
import type { ReactNode } from "react";

export function Btn({ variant = "primary", size = "md", children, onClick, disabled, className = "", to }: {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "outline-light";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  to?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-full transition-all duration-200 cursor-pointer select-none";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-[#174A36] hover:-translate-y-0.5 active:scale-95",
    secondary: "bg-card text-foreground border border-border hover:bg-secondary hover:-translate-y-0.5 active:scale-95",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95",
    accent: "bg-accent text-accent-foreground shadow-[0_7px_20px_rgba(200,241,105,0.22)] hover:bg-[#D5F68A] hover:-translate-y-0.5 active:scale-95",
    "outline-light": "bg-transparent text-white border border-white/30 hover:bg-white/10 active:scale-95",
  };
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-35 cursor-not-allowed pointer-events-none" : ""} ${className}`;
  if (to && !disabled) {
    return <Link to={to} onClick={onClick} className={classes}>{children}</Link>;
  }
  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
