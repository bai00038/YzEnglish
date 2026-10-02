import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";

// Editorial header per 方向稿: forest-green rounded-square logo mark with
// paper serif "YZ", two-line wordmark, three plain links, forest-green
// capsule CTA. No divider line, no dashboard chrome.
const LINKS: [string, string][] = [
  ["/explore", "场景库"],
  ["/resources", "学习资料"],
  ["/about", "关于"],
];

export function DesktopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="hidden min-[641px]:flex fixed top-0 left-0 right-0 z-50 h-16 lg:h-20 items-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-[1120px] w-full mx-auto px-6 md:px-10 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 flex-shrink-0" aria-label="YZ English 首页">
          <span className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="font-display font-semibold text-[#F7F4EE] text-[17px] lg:text-[19px] leading-none">
              YZ
            </span>
          </span>
          <span className="leading-none">
            <span className="block font-bold text-[17px] lg:text-[19px] tracking-[0.04em] text-primary">
              YZ ENGLISH
            </span>
            <span className="block text-[9px] lg:text-[10px] font-semibold tracking-[0.24em] text-muted-foreground mt-1.5">
              REAL SCENES FOR REAL LIFE
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-8 lg:gap-10">
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
        <Link
          to="/explore"
          className="flex-shrink-0 text-[14px] font-bold text-[#F7F4EE] bg-primary rounded-full px-6 py-2.5 hover:opacity-90 transition-opacity"
        >
          逛场景库
        </Link>
      </div>
    </nav>
  );
}
