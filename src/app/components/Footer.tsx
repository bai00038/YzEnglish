import { Link } from "react-router";

// Minimal brand sign-off — wordmark, tagline, copyright. Nothing else.
export function Footer() {
  return (
    <footer className="bg-primary px-6 pt-14 pb-10">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-block leading-none">
          <span className="font-display font-semibold text-[22px] tracking-tight text-[#F7F4EE]">
            YZ English
          </span>
        </Link>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase mt-2 text-[#F7F4EE]/50">
          real scenes for real life
        </p>
        <p className="text-[11px] mt-6 text-[#F7F4EE]/40">
          为海外生活而生的真场景英语
        </p>
        <p className="text-[10px] mt-2 text-[#F7F4EE]/25">© 2026 Yz English. All rights reserved.</p>
      </div>
    </footer>
  );
}
