import { Link } from "react-router";
import yzEnglishLogo from "@/imports/logo-4.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Music2, BookMarked, MessageCircle } from "lucide-react";

const SOCIAL_ICONS = [
  { label: "Douyin", Icon: Music2 },
  { label: "Xiaohongshu", Icon: BookMarked },
  { label: "WeChat", Icon: MessageCircle },
];

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#0F2E24" }} className="px-4 pt-10 pb-8">
      <div className="max-w-lg mx-auto md:max-w-5xl">
        {/* Logo */}
        <Link to="/" className="mb-5 block">
          <ImageWithFallback
            src={yzEnglishLogo}
            alt="Yz English — Real English for Real Life"
            className="object-contain"
            style={{ height: "40px", width: "auto" }}
          />
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-y-4 mb-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {([["Home", "/"], ["Explore", "/explore"], ["Resources", "/resources"], ["About", "/about"], ["Contact", "/contact"]] as [string, string][]).map(([l, p]) => (
              <Link key={l} to={p} className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {SOCIAL_ICONS.map(({ label, Icon }) => (
              <Link key={label} to="/contact" aria-label={label}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                <Icon size={15} />
              </Link>
            ))}
          </div>
        </div>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>© 2026 Yz English. All rights reserved.</p>
      </div>
    </footer>
  );
}
