import { Link, useLocation } from "react-router";
import yzEnglishLogo from "@/imports/logo-4.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Search } from "lucide-react";
import { isNavActive } from "@/app/components/nav-utils";

export function DesktopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center" style={{ backgroundColor: "#184C3A" }}>
      <div className="max-w-lg mx-auto md:max-w-5xl w-full px-4 flex items-center gap-10">
        <Link to="/" className="flex-shrink-0 flex items-center">
          <ImageWithFallback
            src={yzEnglishLogo}
            alt="Yz English — Real English for Real Life"
            className="object-contain lg:h-[56px] h-[46px]"
            style={{ width: "auto" }}
          />
        </Link>
        {([["/", "Home"], ["/explore", "Explore"], ["/resources", "Resources"], ["/about", "About"], ["/contact", "Contact"]] as [string, string][]).map(([path, label]) => {
          const active = isNavActive(pathname, path);
          return (
            <Link key={path} to={path}
              className={`text-sm font-semibold transition-colors relative py-4 ${
                active
                  ? "text-accent"
                  : "text-white/70 hover:text-white"
              }`}
              style={active ? { color: "#B7F21D" } : {}}>
              {label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#B7F21D" }} />}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-2 rounded-xl px-3.5 py-2 cursor-text" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <Search size={13} className="text-white/40" />
          <span className="text-xs text-white/40">Search scenes…</span>
        </div>
      </div>
    </nav>
  );
}
