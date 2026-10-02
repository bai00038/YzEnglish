import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";

export function DesktopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="bg-background">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 pb-2.5 pt-[22px] md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="display-serif grid h-[38px] w-[42px] place-items-center rounded-[10px] bg-primary text-base font-bold tracking-[0.02em] text-accent">YZ</span>
          <span>
            <b className="block text-lg tracking-[-0.02em] text-foreground">YZ English</b>
            <span className="mt-px block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">real scenes for real life</span>
          </span>
        </Link>

        <div className="hidden items-center gap-[22px] text-sm font-medium text-secondary-foreground min-[761px]:flex">
          {([['/', '首页'], ['/explore', '场景库'], ['/resources', '学习资料'], ['/about', '关于']] as [string, string][]).map(([path, label]) => (
            <Link key={path} to={path} className={`transition-colors hover:text-foreground ${isNavActive(pathname, path) ? 'text-foreground' : ''}`}>{label}</Link>
          ))}
        </div>

        <Link to="/explore" className="rounded-full bg-foreground px-4 py-2.5 text-[13px] font-bold text-background">逛场景库</Link>
      </div>
    </nav>
  );
}
