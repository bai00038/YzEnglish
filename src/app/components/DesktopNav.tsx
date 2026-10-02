import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";

// Minimal editorial header — paper background, serif wordmark, three
// plain text links. Deliberately no search box, no pills, no dashboard
// chrome: the "深林编辑" voice starts here.
const LINKS: [string, string][] = [
  ["/explore", "场景库"],
  ["/resources", "学习资料"],
  ["/about", "关于"],
];

export function DesktopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="hidden min-[641px]:flex fixed top-0 left-0 right-0 z-50 h-16 items-center bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl w-full mx-auto px-6 flex items-center gap-10">
        <Link to="/" className="flex-shrink-0 leading-none">
          <span className="font-display font-semibold text-[19px] tracking-tight text-foreground">
            YZ English
          </span>
          <span className="block text-[9px] font-semibold tracking-[0.22em] uppercase text-muted-foreground mt-0.5">
            real scenes for real life
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-8">
          {LINKS.map(([path, label]) => {
            const active = isNavActive(pathname, path);
            return (
              <Link
                key={path}
                to={path}
                className={`text-sm transition-colors relative py-5 ${
                  active ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-3 left-0 right-0 h-[2px] rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
