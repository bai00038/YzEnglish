import { Link, useLocation } from "react-router";
import { Home, Grid, Info, UserRound } from "lucide-react";
import { isNavActive } from "@/app/components/nav-utils";

export function MobileNav() {
  const { pathname } = useLocation();
  const items = [
    { label: "首页", path: "/", Icon: Home },
    { label: "场景库", path: "/explore", Icon: Grid },
    { label: "我的学习", path: "/membership", Icon: UserRound },
    { label: "关于", path: "/about", Icon: Info },
  ];
  return (
    <nav
      className="mobile-site-nav fixed bottom-0 left-0 right-0 z-50 flex w-full border-t border-border bg-card lg:hidden"
      style={{
        height: "var(--mobile-nav-height)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ label, path, Icon }) => {
        const active = isNavActive(pathname, path);
        return (
          <Link key={label} to={path} className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <div className={`flex items-center justify-center w-9 h-6 rounded-full transition-colors ${active ? "bg-primary/10" : ""}`}>
              <Icon size={19} className={active ? "text-primary" : "text-muted-foreground"} strokeWidth={active ? 2.5 : 1.75} />
            </div>
            <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
