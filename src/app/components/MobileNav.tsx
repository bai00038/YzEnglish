import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";

// Minimal bottom tab bar — paper background, quiet icons, no pills.
const ITEMS = [
  { label: "首页", path: "/" },
  { label: "场景库", path: "/explore" },
  { label: "学习资料", path: "/resources" },
  { label: "关于", path: "/about" },
];

export function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="min-[641px]:hidden fixed bottom-0 left-0 right-0 z-50 flex w-full bg-background/95 backdrop-blur-sm border-t border-border"
      style={{
        height: "var(--mobile-nav-height)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {ITEMS.map(({ label, path }) => {
        const active = isNavActive(pathname, path);
        return (
          <Link key={label} to={path} className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <span
              className={`block w-5 h-[2px] rounded-full transition-colors ${active ? "bg-accent" : "bg-transparent"}`}
            />
            <span className={`text-[11px] ${active ? "text-foreground font-bold" : "text-muted-foreground font-medium"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
