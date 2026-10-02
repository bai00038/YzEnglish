import { Link } from "react-router";
import { Music2, BookMarked, MessageCircle } from "lucide-react";

const SOCIAL_ICONS = [
  { label: "抖音", Icon: Music2 },
  { label: "小红书", Icon: BookMarked },
  { label: "微信公众号", Icon: MessageCircle },
];

export function Footer() {
  return (
    <footer className="bg-primary px-5 text-white/75 md:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-9 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10 md:py-14">
          <div>
            <Link to="/" className="display-serif text-[27px] font-semibold leading-none text-white transition-colors hover:text-accent">
              YZ English
            </Link>
            <p className="display-serif mt-2 text-base italic text-accent">real scenes for real life</p>
            <p className="mt-2 text-sm text-white/60">为海外生活而生的真场景英语</p>
          </div>

          <div>
            <p className="mb-4 text-xs font-medium tracking-[0.28em] text-white/50">导航</p>
            <nav className="grid gap-2.5 text-[15px]" aria-label="页脚导航">
              {([["首页", "/"], ["场景库", "/explore"], ["关于", "/about"], ["联系我们", "/contact"]] as [string, string][]).map(([label, path]) => (
                <Link key={label} to={path} className="w-fit text-white/85 transition-colors hover:text-accent">{label}</Link>
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
          <span>© 2026 YZ English. All rights reserved.</span>
          <span className="display-serif italic">real scenes for real life</span>
        </div>
      </div>
    </footer>
  );
}
