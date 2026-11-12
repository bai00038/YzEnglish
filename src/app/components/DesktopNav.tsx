import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";
import { useNavVisibility } from "@/app/components/nav-visibility";
import { useMembershipAccess } from "@/data/membership";

export function DesktopNav() {
  const { pathname } = useLocation();
  const { isUnlocked } = useMembershipAccess();
  const { hidden } = useNavVisibility();
  return (
    <nav className={`sticky top-0 z-50 bg-background transition-transform duration-300 ease-out ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-3 py-3.5 sm:px-6 md:py-4 lg:gap-5 lg:px-8 lg:py-5">
        <Link to="/" className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <img src="/yz-english-logo.png" alt="Yz English" className="h-12 w-12 flex-none object-contain sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]" />
          <span>
            <b aria-label="Yz English" className="block whitespace-nowrap font-sans text-[25px] font-bold leading-[0.92] tracking-[-0.015em] text-foreground sm:text-[30px] lg:text-[32px]">
              <span aria-hidden="true">Yz Engl<span className="relative inline-block">ı<span className="absolute left-1/2 top-[0.02em] h-[0.18em] w-[0.18em] -translate-x-1/2 rounded-full bg-[#48A23F]" /></span>sh</span>
            </b>
            <span className="mt-1 block whitespace-nowrap text-[8.5px] font-medium uppercase tracking-[0.27em] text-muted-foreground sm:text-[10px] sm:tracking-[0.32em]">real scenes for real life</span>
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-1 text-[15px] font-medium text-secondary-foreground lg:flex xl:gap-2 xl:text-[16px]">
          {([['/', '首页'], ['/explore', '场景库'], ['/membership', '我的学习'], ['/about', '关于']] as [string, string][]).map(([path, label]) => (
            <Link key={path} to={path}
              className={`rounded-full px-4 py-2.5 transition-colors xl:px-5 xl:py-3 ${isNavActive(pathname, path) ? 'bg-primary font-semibold text-white' : 'hover:bg-secondary hover:text-foreground'}`}>
              {label}
            </Link>
          ))}
          {!isUnlocked && <a href="/#free" className="ml-1 rounded-full border border-accent bg-accent px-4 py-2.5 font-semibold text-primary transition-[filter] hover:brightness-95 xl:px-5 xl:py-3">免费体验</a>}
        </div>
      </div>
    </nav>
  );
}
