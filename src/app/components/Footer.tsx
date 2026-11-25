import { Link } from "react-router";
import { useSyncExternalStore } from 'react';
import { Music2, BookMarked, MessageCircle, LockKeyhole } from "lucide-react";

import { useMembershipAccess } from "@/data/membership";

const SOCIAL_ICONS = [
  { label: "抖音", Icon: Music2 },
  { label: "小红书", Icon: BookMarked },
  { label: "视频号", Icon: MessageCircle },
];

const DESKTOP_NAV_QUERY = '(min-width: 1024px)'; // Matches MobileNav's lg:hidden.
function subscribeToDesktopNav(listener: () => void) {
  const media = window.matchMedia(DESKTOP_NAV_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

export function Footer() {
  const { isUnlocked } = useMembershipAccess();
  const desktopNav = useSyncExternalStore(subscribeToDesktopNav, () => window.matchMedia(DESKTOP_NAV_QUERY).matches, () => true);
  if (!desktopNav) return null;
  return (
    <footer className="bg-primary px-3 text-white/75 md:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-2 gap-9 py-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10 md:py-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" aria-label="Yz English 首页" className="block w-fit">
              <img src="/yz-english-lockup-v2.png?v=0b159232c140" alt="" width={578} height={179} className="block h-auto w-[164px] object-contain" />
            </Link>
            <p className="mt-2 text-sm text-white/60">深入真实场景，摆脱口语困境</p>
            <div role="img" aria-label="Real scenes for real life." className="mt-5 w-[280px] max-w-full bg-accent"
              style={{ aspectRatio: "1844 / 853", maskImage: "url('/yz-english-slogan-transparent.png?v=b713fc61ce86')", WebkitMaskImage: "url('/yz-english-slogan-transparent.png?v=b713fc61ce86')", maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }} />
          </div>

          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.28em] text-white/50">导航</p>
            <nav className="grid gap-2.5 text-[15px]" aria-label="页脚导航">
              {([["首页", "/"], ["场景库", "/explore"], ["锦囊库", "/kit"], ["我的学习", "/my-learning"], ["关于", "/about"], ["联系我们", "/contact"]] as [string, string][]).map(([label, path]) => (
                <Link key={label} to={path} className="flex w-fit items-center gap-1 text-white/85 transition-colors hover:text-accent">{label}{path === "/kit" && !isUnlocked && <LockKeyhole size={12} aria-label="未解锁" />}</Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.28em] text-white/50">关注我们</p>
            <div className="grid gap-2.5 text-[15px]">
            {SOCIAL_ICONS.map(({ label, Icon }) => (
              <Link key={label} to="/contact" aria-label={label}
                className="flex w-fit items-center gap-2.5 text-white/85 transition-colors hover:text-accent">
                <Icon size={16} className="opacity-85" />
                <span>{label}</span>
              </Link>
            ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-white/15 py-5 text-[13px] text-white/45 md:pb-7">
          <span>© 2026 Yz English. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
