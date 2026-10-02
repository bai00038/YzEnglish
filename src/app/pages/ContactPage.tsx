import { useLayoutEffect, useRef, useState } from "react";
import { SmileCurve, DouyinIcon, XiaohongshuIcon, WeChatIcon } from "@/app/components/brand";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import douyinQrCode from "@/imports/douyin-qr-code.png";
import xiaohongshuQrCode from "@/imports/xiaohongshu-qr-code.jpg";
import weixinQrCode from "@/imports/weixin-qr-code.png";

const CHANNELS = [
  { key: "douyin", Icon: DouyinIcon, color: "#000000", en: "Douyin", zh: "抖音", handle: "Scan to follow on Douyin", qrCode: douyinQrCode },
  { key: "xiaohongshu", Icon: XiaohongshuIcon, color: "#FF2442", en: "Xiaohongshu", zh: "小红书", handle: "Scan to follow on Xiaohongshu", qrCode: xiaohongshuQrCode },
  { key: "wechat", Icon: WeChatIcon, color: "#07C160", en: "WeChat", zh: "微信", handle: "Scan to add on WeChat", qrCode: weixinQrCode },
];

export function ContactPage() {
  const zhRef = useRef<HTMLParagraphElement>(null);
  const [oneLineWidth, setOneLineWidth] = useState<number>();

  useLayoutEffect(() => {
    const zh = zhRef.current;
    const container = zh?.parentElement;
    if (!zh || !container) return;

    const measure = () => {
      const prevWhiteSpace = zh.style.whiteSpace;
      const prevDisplay = zh.style.display;
      zh.style.whiteSpace = "nowrap";
      zh.style.display = "inline-block";
      const naturalWidth = zh.scrollWidth;
      zh.style.whiteSpace = prevWhiteSpace;
      zh.style.display = prevDisplay;
      setOneLineWidth(naturalWidth <= container.clientWidth ? naturalWidth : undefined);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-14 md:pt-16 md:pb-20">
          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: "#C8F169", color: "#12241C" }}>
            Contact · 联系我们
          </span>
          <h1 className="display-serif text-[40px] md:text-[62px] font-bold leading-[1.06] tracking-[-0.01em] text-foreground mb-3">
            Let's stay connected
          </h1>
          <p className="font-['Noto_Serif_SC'] text-lg md:text-xl font-bold mb-6" style={{ color: "#0F3527" }}>扫码关注，保持联系</p>
          <p
            className="display-serif text-sm md:text-base italic text-muted-foreground leading-relaxed max-w-xl mb-3"
            style={oneLineWidth ? { maxWidth: oneLineWidth } : undefined}
          >
            Follow Yz English on Douyin and Xiaohongshu for new real-life scenes, or scan the WeChat code to reach out directly.
          </p>
          <p
            ref={zhRef}
            className={`text-sm text-muted-foreground leading-relaxed ${oneLineWidth ? "w-fit whitespace-nowrap" : "max-w-xl"}`}
            style={{ color: "rgba(15,53,39,0.7)" }}
          >
            关注 Yz English 的抖音与小红书，第一时间获取新场景内容；也可以扫描微信二维码直接联系我们。
          </p>
        </div>
      </section>

      {/* ══ QR CODES ══════════════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Follow &amp; reach us</p>
          <h2 className="display-serif text-[28px] md:text-[36px] font-bold leading-tight tracking-[-0.01em] text-foreground mb-1">
            Scan a code to connect
          </h2>
          <p className="font-['Noto_Serif_SC'] text-base font-bold mb-10" style={{ color: "#0F3527" }}>扫描下方二维码</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {CHANNELS.map(({ key, Icon, color, en, zh, handle, qrCode }) => (
              <div key={key} className="bg-background rounded-2xl border border-border px-5 py-6 shadow-sm flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center mb-4" style={{ color }}>
                  <Icon size={16} />
                </div>
                <div
                  className="w-40 h-40 rounded-xl overflow-hidden flex items-center justify-center mb-4"
                  style={{ border: "1px solid rgba(15,53,39,0.15)", backgroundColor: "#FFFFFF" }}
                >
                  <ImageWithFallback
                    src={qrCode}
                    alt={`${en} QR code`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="display-serif text-[17px] font-bold text-foreground leading-snug">{en}</p>
                <p className="font-['Noto_Serif_SC'] text-sm font-bold mt-0.5 mb-2" style={{ color: "#0F3527" }}>{zh}</p>
                <p className="text-xs text-muted-foreground">{handle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CLOSING ═══════════════════════════════════════════════════════════ */}
      <section className="border-t border-border" style={{ backgroundColor: "#f7f6f3" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <SmileCurve width={64} opacity={0.5} className="mx-auto mb-6" />
          <h2 className="display-serif text-[30px] md:text-[42px] font-bold leading-tight tracking-[-0.01em] text-foreground mb-2">
            We'd love to hear from you.
          </h2>
          <p className="font-['Noto_Serif_SC'] text-base font-bold" style={{ color: "#0F3527" }}>
            期待与你交流。
          </p>
        </div>
      </section>
    </div>
  );
}
