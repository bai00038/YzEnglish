import { Link, useLocation } from "react-router";
import { Home, Grid, UserRound, BookOpen, LockKeyhole } from "lucide-react";
import { useMembershipAccess } from "@/data/membership";
import { isNavActive } from "@/app/components/nav-utils";

export function MobileNav() {
  const { pathname } = useLocation();
  const { isUnlocked } = useMembershipAccess();
  const items = [
    { label: "首页", path: "/", Icon: Home },
    { label: "场景库", path: "/explore", Icon: Grid },
    { label: "锦囊库", path: "/kit", Icon: BookOpen },
    { label: "我的学习", path: "/membership", Icon: UserRound },
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
          <Link key={label} to={path} className="group flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <div className={`flex items-center justify-center relative w-9 h-6 rounded-full transition-colors ${active ? "bg-secondary" : "group-hover:bg-secondary group-active:bg-secondary"}`}>
              {path === "/kit" && !isUnlocked && <LockKeyhole size={9} className="absolute -right-0.5 -top-0.5 text-muted-foreground" />}
              <Icon size={19} className={active ? "text-[#0F3527]" : "text-[#666]"} strokeWidth={active ? 2.5 : 1.75} />
            </div>
            <span className={`text-[10px] font-semibold ${active ? "text-[#0F3527]" : "text-[#666]"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
