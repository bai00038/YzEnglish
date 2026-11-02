import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";
import { useMembershipAccess } from "@/data/membership";

export function DesktopNav() {
  const { pathname } = useLocation();
  const { isUnlocked } = useMembershipAccess();
  return (
    <nav className="bg-background">
      <div className="mx-auto flex max-w-[1180px] items-center gap-5 px-5 py-4 md:px-8 md:py-5">
        <Link to="/" className="flex items-center gap-3.5">
          <img src="/yz-english-logo.png" alt="Yz English" className="h-[52px] w-[52px] flex-none object-contain md:h-[56px] md:w-[56px]" />
          <span>
            <b className="block font-sans text-[25px] font-semibold leading-none tracking-[-0.02em] text-foreground">Yz English</b>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">real scenes for real life</span>
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-2 text-[16px] font-medium text-secondary-foreground min-[761px]:flex">
          {([['/', '首页'], ['/explore', '场景库'], ['/membership', '我的会员'], ['/about', '关于']] as [string, string][]).map(([path, label]) => (
            <Link key={path} to={path}
              className={`rounded-full px-5 py-3 transition-colors ${isNavActive(pathname, path) ? 'bg-primary font-semibold text-white' : 'hover:bg-secondary hover:text-foreground'}`}>
              {label}
            </Link>
          ))}
          {!isUnlocked && <a href="/#free" className="ml-1 rounded-full border border-accent bg-accent px-5 py-3 font-semibold text-primary transition-[filter] hover:brightness-95">免费体验</a>}
        </div>
      </div>
    </nav>
  );
}
