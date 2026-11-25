import { useMessages } from "@/data/messages";
import { LockKeyhole } from "lucide-react";
import { Link, useLocation } from "react-router";
import { isNavActive } from "@/app/components/nav-utils";
import { useNavVisibility } from "@/app/components/nav-visibility";
import { useMembershipAccess } from "@/data/membership";

export function DesktopNav() {
  const { pathname, search } = useLocation();
  const { hasUnread } = useMessages();
  const { isUnlocked } = useMembershipAccess();
  const { hidden } = useNavVisibility();
  return (
    <nav className={`sticky top-0 z-50 border-b border-primary/10 bg-background transition-transform duration-300 ease-out ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-3 py-2 sm:px-6 md:py-2.5 lg:gap-5 lg:px-8 lg:py-3">
        <Link to="/" aria-label="Yz English 首页" className="flex min-w-0 flex-none items-center">
          <img src="/yz-english-lockup-v1.png?v=6286d0690049" alt="" width={575} height={179} className="block h-auto w-[168px] object-contain sm:w-[180px] lg:w-[184px]" />
        </Link>

        <div className="ml-auto hidden items-center gap-1 text-[15px] font-medium text-[#666] lg:flex xl:gap-2 xl:text-[16px]">
          {([['/', '首页'], ['/explore', '场景库'], ['/kit', '锦囊库'], ['/my-learning', '我的学习']] as [string, string][]).map(([path, label]) => (
            <Link key={path} to={path}
              className={`relative rounded-full px-4 py-2.5 transition-colors xl:px-5 xl:py-3 ${isNavActive(pathname, path, search) ? 'bg-secondary font-semibold text-[#0F3527]' : 'hover:bg-secondary hover:text-foreground'}`}>
              {label}{path === "/my-learning" && hasUnread && <span className="learning-dot" aria-label="有未读消息" />}{path === "/kit" && !isUnlocked && <LockKeyhole size={12} className="ml-1 inline" />}
            </Link>
          ))}
          {!isUnlocked && <a href="/#free" className="ml-1 rounded-full border border-accent bg-accent px-4 py-2.5 font-semibold text-primary transition-[filter] hover:brightness-95 xl:px-5 xl:py-3">免费体验</a>}
        </div>
      </div>
    </nav>
  );
}
