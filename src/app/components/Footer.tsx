import { Link } from "react-router";
import yzEnglishLogo from "@/imports/logo-4.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SmileCurve } from "@/app/components/brand";

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#0F2E24" }} className="px-4 pt-10 pb-8">
      <div className="max-w-lg mx-auto md:max-w-5xl">
        {/* Logo */}
        <Link to="/" className="mb-1 block">
          <ImageWithFallback
            src={yzEnglishLogo}
            alt="Yz English — Real English for Real Life"
            className="object-contain"
            style={{ height: "40px", width: "auto" }}
          />
        </Link>
        {/* Smile-curve brand separator */}
        <SmileCurve width={64} opacity={0.35} className="mb-5" />
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          {([["Home", "/"], ["Explore", "/explore"], ["Resources", "/resources"], ["About", "/about"]] as [string, string][]).map(([l, p]) => (
            <Link key={l} to={p} className="hover:text-white transition-colors">{l}</Link>
          ))}
          <button className="hover:text-white transition-colors">Contact</button>
        </div>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>© 2026 Yz English. All rights reserved.</p>
      </div>
    </footer>
  );
}
