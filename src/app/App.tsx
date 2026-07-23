import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router";
import yzEnglishLogo from "@/imports/logo-4.png";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import type { ReactNode } from "react";
import {
  Search, Home, Grid, FileText, Info, ChevronRight, Play,
  Volume2, Bookmark, Share2, ChevronLeft, Mic,
  Clock, Globe, BarChart2, Download, ArrowRight, X, Layers,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Shopping & Returns", "Food & Restaurants", "School & Family",
  "Healthcare", "Banking & Services", "Housing",
  "Transportation", "Social Life", "Work", "Travel", "Emergencies",
];

const REGIONS = [
  "Universal", "North America", "Canada", "United States",
  "United Kingdom", "Australia", "New Zealand", "Travel",
];

const CATEGORY_BG: Record<string, string> = {
  "Shopping & Returns": "bg-blue-50",
  "Food & Restaurants": "bg-orange-50",
  "School & Family": "bg-purple-50",
  "Healthcare": "bg-green-50",
  "Banking & Services": "bg-slate-100",
  "Housing": "bg-yellow-50",
  "Transportation": "bg-cyan-50",
  "Social Life": "bg-pink-50",
  "Work": "bg-indigo-50",
  "Travel": "bg-teal-50",
  "Emergencies": "bg-red-50",
};

const SCENES = [
  { id: 1, slug: "returning-clothes-at-a-store", titleEn: "Returning Clothes at a Store", titleZh: "在商店退衣服", category: "Shopping & Returns", region: "Universal", level: "A2–B1", duration: "2 min", featured: true, isNew: false, desc: "Learn how to handle a return at a clothing store, including what to do when you don't have a receipt." },
  { id: 2, slug: "picking-up-a-child-early-from-school", titleEn: "Picking Up a Child Early from School", titleZh: "提前接孩子放学", category: "School & Family", region: "Universal", level: "A2–B1", duration: "5 min", featured: true, isNew: true, desc: "Practice talking to the school office when you need to pick up your child before dismissal." },
  { id: 3, slug: "booking-a-dentist-appointment", titleEn: "Booking a Dentist Appointment", titleZh: "预约牙医", category: "Healthcare", region: "Universal", level: "B1–B2", duration: "6 min", featured: false, isNew: false, desc: "Learn to call a dental clinic, answer intake questions, and confirm your appointment." },
  { id: 4, slug: "asking-for-a-costco-price-adjustment", titleEn: "Asking for a Costco Price Adjustment", titleZh: "Costco价格调整申请", category: "Shopping & Returns", region: "Canada", level: "A2–B1", duration: "3 min", featured: false, isNew: true, desc: "Understand how to request a price adjustment if an item you bought goes on sale within the allowed window." },
  { id: 5, slug: "ordering-at-a-drive-through", titleEn: "Ordering at a Drive-Through", titleZh: "得来速点餐", category: "Food & Restaurants", region: "North America", level: "A1–A2", duration: "3 min", featured: true, isNew: false, desc: "Practice ordering food at a drive-through, including customizing your order and paying." },
  { id: 6, slug: "reporting-a-repair-issue-to-your-landlord", titleEn: "Reporting a Repair Issue to Your Landlord", titleZh: "向房东报修", category: "Housing", region: "Universal", level: "B1–B2", duration: "5 min", featured: false, isNew: false, desc: "Learn to describe a maintenance problem clearly and follow up on the repair status." },
  { id: 7, slug: "checking-in-at-a-hotel", titleEn: "Checking In at a Hotel", titleZh: "酒店入住", category: "Travel", region: "Universal", level: "A2–B1", duration: "4 min", featured: false, isNew: false, desc: "Navigate the front desk check-in process, including room preferences and facility questions." },
  { id: 8, slug: "airport-check-in-and-baggage-drop", titleEn: "Airport Check-In and Baggage Drop", titleZh: "机场值机与行李托运", category: "Travel", region: "Universal", level: "A2–B1", duration: "5 min", featured: false, isNew: true, desc: "Handle the airline check-in counter, answer security questions, and deal with overweight baggage." },
  { id: 9, slug: "calling-in-sick-at-work", titleEn: "Calling in Sick at Work", titleZh: "打电话请病假", category: "Work", region: "Universal", level: "A2–B1", duration: "3 min", featured: false, isNew: false, desc: "Learn the right words and tone to call your manager when you cannot come to work." },
];

const DIALOGUE = [
  { speaker: "You", speakerZh: "顾客", en: "Hi, I'd like to return these two items, please.", zh: "你好，我想退这两件商品。" },
  { speaker: "Staff", speakerZh: "店员", en: "Of course! Do you have the receipts for both?", zh: "当然可以。请问两件都有收据吗？" },
  { speaker: "You", speakerZh: "顾客", en: "I have a receipt for the jacket, but I lost the receipt for the sweater.", zh: "夹克有收据，但毛衣的收据找不到了。" },
  { speaker: "Staff", speakerZh: "店员", en: "That's okay. For the jacket, I can refund to your original payment method. For the sweater, without a receipt, I can offer store credit.", zh: "没关系。夹克我可以退款到您的原始付款方式。毛衣没有收据的话，我可以给您店内购物积分。" },
  { speaker: "You", speakerZh: "顾客", en: "What exactly is store credit?", zh: "店内积分是什么意思？" },
  { speaker: "Staff", speakerZh: "店员", en: "It's a credit you can use toward any future purchase here in the store. It doesn't expire.", zh: "就是可以在本店用于任何未来购物的积分，没有使用期限。" },
  { speaker: "You", speakerZh: "顾客", en: "Okay, that works for me. Here's the receipt for the jacket.", zh: "好的，可以接受。这是夹克的收据。" },
  { speaker: "Staff", speakerZh: "店员", en: "Thank you. Did you pay by card?", zh: "谢谢。请问您是刷卡付款的吗？" },
  { speaker: "You", speakerZh: "顾客", en: "Yes, by credit card.", zh: "是的，用信用卡付的。" },
  { speaker: "Staff", speakerZh: "店员", en: "Please tap or insert your card. The refund for the jacket will appear within 3 to 5 business days.", zh: "请轻触或插入您的卡。夹克的退款将在3至5个工作日内到账。" },
  { speaker: "You", speakerZh: "顾客", en: "And the store credit for the sweater?", zh: "那毛衣的店内积分呢？" },
  { speaker: "Staff", speakerZh: "店员", en: "I'll add it to a store credit card right now. You can use it today if you like.", zh: "我现在就把积分存入购物积分卡，如果您愿意，今天就可以使用。" },
  { speaker: "You", speakerZh: "顾客", en: "Great, thank you so much.", zh: "太好了，非常感谢。" },
  { speaker: "Staff", speakerZh: "店员", en: "You're welcome! Have a great day.", zh: "不客气，祝您今天愉快！" },
];

const EXPRESSIONS = [
  { en: "I'd like to return these.", zh: "我想退这些商品。", note: "Natural opening — works for one or multiple items" },
  { en: "I have a receipt for this one, but not for the other.", zh: "这件有收据，但那件没有。", note: "Explains the situation clearly upfront" },
  { en: "What exactly is store credit?", zh: "店内积分是什么意思？", note: "Ask if you don't understand — staff expect this question" },
  { en: "That works for me.", zh: "可以接受。/ 没问题。", note: "Casual, friendly way to agree to a solution" },
  { en: "The refund will appear within 3 to 5 business days.", zh: "退款将在3至5个工作日内到账。", note: "Staff phrase — know it so you understand the timeline" },
];

const VOCABULARY = [
  { word: "receipt", phonetic: "/rɪˈsiːt/", pos: "n.", zh: "收据", example: "I have the receipt right here." },
  { word: "refund", phonetic: "/ˈriːfʌnd/", pos: "n./v.", zh: "退款", example: "Can I get a refund?" },
  { word: "store credit", phonetic: "", pos: "n.", zh: "店内积分 / 购物券", example: "I'll take store credit." },
  { word: "original payment method", phonetic: "", pos: "n.", zh: "原始付款方式", example: "Refunded to your original payment method." },
  { word: "expire", phonetic: "/ɪkˈspaɪər/", pos: "v.", zh: "过期", example: "The store credit doesn't expire." },
];

const TIPS = [
  { title: "No receipt? Store credit is normal", titleZh: "没有收据？店内积分是正常解决方案", body: "In North America, stores are not required to accept returns without a receipt. Most will offer store credit as a compromise — it's common and not a punishment. Don't be surprised or offended.", bodyZh: "在北美，商店没有义务接受无收据退货。大多数商店会提供店内积分作为折中方案——这很常见，并非惩罚。不必感到惊讶或不满。" },
  { title: "Keep receipts, even small ones", titleZh: "保留收据，哪怕是小额购物", body: "A photo of your receipt on your phone is usually accepted. Some stores can look up purchases made by credit card if you've lost the paper receipt.", bodyZh: "手机里的收据照片通常也可被接受。如果纸质收据丢失，有些商店可以通过信用卡记录查询购买历史。" },
  { title: "Refund timing depends on your bank", titleZh: "退款时间取决于您的银行", body: "When a store says '3 to 5 business days', the store has already processed it. The delay is on your bank's side — weekends and holidays don't count.", bodyZh: "当商店说「3至5个工作日」时，商店已经处理完毕。延迟来自您银行的处理时间——周末和节假日不计算在内。" },
];

const RELATED = [
  { id: 4, titleEn: "Asking for a Costco Price Adjustment", titleZh: "Costco价格调整申请", level: "A2–B1", duration: "3 min", category: "Shopping & Returns" },
  { id: 5, titleEn: "Ordering at a Drive-Through", titleZh: "得来速点餐", level: "A1–A2", duration: "3 min", category: "Food & Restaurants" },
  { id: 7, titleEn: "Checking In at a Hotel", titleZh: "酒店入住", level: "A2–B1", duration: "4 min", category: "Travel" },
];

const PDF_RESOURCES = [
  { id: 1, title: "Shopping English Starter Pack", titleZh: "购物英语入门资料包", type: "free", desc: "Covers returns, price matching, and asking for help in stores.", scenes: 5, free: true, category: "Shopping & Returns" },
  { id: 2, title: "Airport & Hotels Travel Pack", titleZh: "机场与酒店旅行英语包", type: "travel", desc: "Airport check-in, hotel conversations, and emergency phrases for international travel.", scenes: 8, free: false, category: "Travel" },
  { id: 3, title: "Canada Life: First 30 Days", titleZh: "加拿大生活第一个月", type: "collection", desc: "Bank account, SIM card, family doctor, school, and grocery store.", scenes: 12, free: false, category: "Canada" },
  { id: 4, title: "Canadian Parenting English", titleZh: "加拿大家长沟通英语", type: "collection", desc: "School absence calls, parent-teacher talks, and allergy form conversations.", scenes: 7, free: false, category: "School & Family" },
  { id: 5, title: "Healthcare English Essentials", titleZh: "医疗场景英语基础", type: "free", desc: "Doctor appointments, describing symptoms, dental visits, and pharmacy conversations.", scenes: 6, free: true, category: "Healthcare" },
  { id: 6, title: "Real English in Canada — Series 1", titleZh: "加拿大真实英语系列一", type: "country", desc: "Eight everyday Canadian scenarios with full dialogue, culture notes, and vocabulary.", scenes: 8, free: false, category: "Canada" },
  { id: 7, title: "Travel Emergencies English", titleZh: "旅行紧急情况英语", type: "travel", desc: "Lost passport, medical emergency abroad, and reporting theft to local authorities.", scenes: 4, free: true, category: "Travel" },
  { id: 8, title: "Returning Clothes at a Store — PDF", titleZh: "在商店退衣服学习资料", type: "scene", desc: "Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.", scenes: 1, free: true, category: "Shopping & Returns" },
];

const SCENE_PHOTOS: Record<number, string> = {
  1: "https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=700&h=480&fit=crop&auto=format",
  2: "https://images.unsplash.com/photo-1516901408257-500ed7566e6a?w=700&h=480&fit=crop&auto=format",
  3: "https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=700&h=480&fit=crop&auto=format",
  5: "https://images.unsplash.com/photo-1545575950-59f935d6521c?w=700&h=480&fit=crop&auto=format",
  7: "https://images.unsplash.com/photo-1724230758718-406bab979e67?w=700&h=480&fit=crop&auto=format",
  8: "https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=700&h=480&fit=crop&auto=format",
};

const PDF_TYPE_LABELS: Record<string, string> = {
  free: "Free Resource",
  scene: "Scene PDF",
  collection: "Topic Collection",
  travel: "Travel Pack",
  country: "Country Pack",
};

// ─── Design helpers ───────────────────────────────────────────────────────────

function getLevelStyle(level: string) {
  if (level === "A1–A2") return "bg-emerald-100 text-emerald-800";
  if (level === "A2–B1") return "bg-amber-100 text-amber-800";
  if (level === "B1–B2") return "bg-orange-100 text-orange-800";
  return "bg-secondary text-muted-foreground";
}

// ─── Atomic components ────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${getLevelStyle(level)}`}>
      <BarChart2 size={9} />{level}
    </span>
  );
}

function DurationLabel({ duration }: { duration: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock size={10} />{duration}
    </span>
  );
}

function RegionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium border border-border rounded-full px-2.5 py-0.5 bg-card text-muted-foreground">
      <Globe size={9} />{children}
    </span>
  );
}

function CategoryPill({ children, active, onClick, darkMode = false }: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  darkMode?: boolean;
}) {
  if (darkMode) {
    return (
      <button onClick={onClick}
        className={`inline-flex items-center text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap ${
          active
            ? "bg-accent text-accent-foreground border-accent"
            : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
        }`}>
        {children}
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className={`inline-flex items-center text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap ${
        active
          ? "bg-accent text-accent-foreground border-accent"
          : "bg-card border-border text-foreground hover:border-primary hover:text-primary"
      }`}>
      {children}
    </button>
  );
}

function SectionLabel({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-0.5 h-4 rounded-full ${light ? "bg-accent" : "bg-primary"}`} />
      <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${light ? "text-white/50" : "text-muted-foreground"}`}>{children}</span>
    </div>
  );
}

// ─── Brand DNA primitives ─────────────────────────────────────────────────────

/** Smile-shaped SVG curve — derived from the curved smile stroke in the Yz logo */
function SmileCurve({ width = 56, opacity = 0.75, className = "" }: {
  width?: number; opacity?: number; className?: string;
}) {
  return (
    <svg aria-hidden="true" width={width} height={Math.round(width * 0.32)} viewBox="0 0 56 18" fill="none" className={className} style={{ display: "block" }}>
      <path d="M4 6 Q28 16 52 6" stroke="#B7F21D" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity={opacity} />
    </svg>
  );
}

/** Hand-drawn lime line — short accent stroke */
function LimeLine({ width = 40, opacity = 0.65, className = "" }: {
  width?: number; opacity?: number; className?: string;
}) {
  return (
    <svg aria-hidden="true" width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" className={className} style={{ display: "block" }}>
      <path d={`M2 5 C${width * 0.25} 3, ${width * 0.6} 3.5, ${width - 2} 4.5`} stroke="#B7F21D" strokeWidth="2" strokeLinecap="round" fill="none" opacity={opacity} />
    </svg>
  );
}

/** Speech-bubble speaker label with a tiny left-side tail */
function SpeechBubbleLabel({ isYou, light = false }: { isYou: boolean; light?: boolean }) {
  const bubbleBg = light
    ? (isYou ? "rgba(183,242,29,0.25)" : "rgba(255,255,255,0.12)")
    : (isYou ? "rgba(183,242,29,0.22)" : "white");
  const bubbleColor = light
    ? (isYou ? "#B7F21D" : "rgba(255,255,255,0.6)")
    : (isYou ? "#184C3A" : "#6A6C66");
  const bubbleBorder = light ? "none" : (isYou ? "none" : "1px solid rgba(0,0,0,0.1)");
  const tailFill = light
    ? (isYou ? "rgba(183,242,29,0.25)" : "rgba(255,255,255,0.12)")
    : (isYou ? "rgba(183,242,29,0.22)" : "white");

  return (
    <div className="relative flex-shrink-0 pt-0.5" style={{ width: "56px" }}>
      {/* Tail — left-pointing, sits just left of the bubble */}
      <svg aria-hidden="true" width="6" height="8" viewBox="0 0 6 8" fill="none"
        className="absolute" style={{ left: "-4px", top: "4px" }}>
        <path d="M6 1 L0 4 L6 7 Z" fill={tailFill} />
      </svg>
      <span className="relative text-[10px] font-black px-2 py-0.5 rounded inline-block"
        style={{ backgroundColor: bubbleBg, color: bubbleColor, border: bubbleBorder }}>
        {isYou ? "YOU" : "STAFF"}
      </span>
    </div>
  );
}

function ImgBox({ label, className = "", color = "bg-secondary" }: { label: string; className?: string; color?: string }) {
  return (
    <div className={`${color} flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-muted-foreground text-[10px] font-medium text-center px-2 opacity-70">{label}</span>
    </div>
  );
}

function Btn({ variant = "primary", size = "md", children, onClick, disabled, className = "", to }: {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "outline-light";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  to?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
    secondary: "bg-card text-foreground border border-border hover:bg-secondary active:scale-95",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95",
    accent: "bg-accent text-accent-foreground hover:opacity-90 active:scale-95",
    "outline-light": "bg-transparent text-white border border-white/30 hover:bg-white/10 active:scale-95",
  };
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-35 cursor-not-allowed pointer-events-none" : ""} ${className}`;
  if (to && !disabled) {
    return <Link to={to} className={classes}>{children}</Link>;
  }
  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

function Collapsible({ label, defaultOpen = false, children }: { label: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <ChevronRight size={15} className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Scene card ───────────────────────────────────────────────────────────────

function SceneCard({ scene }: { scene: typeof SCENES[0] }) {
  const photo = SCENE_PHOTOS[scene.id];
  const catColor = CATEGORY_BG[scene.category] ?? "bg-secondary";
  return (
    <Link to={`/scenes/${scene.slug}`} className="block w-full text-left border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200 group">
      <div className="relative h-48 overflow-hidden">
        {photo ? (
          <img src={photo} alt={scene.titleEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <ImgBox label={scene.category} className={`w-full h-full ${catColor}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {scene.isNew && (
          <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide shadow-sm">NEW</span>
        )}
        <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white/90 bg-black/35 backdrop-blur-sm px-2 py-0.5 rounded-md">
          {scene.category}
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{scene.titleEn}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{scene.titleZh}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <LevelBadge level={scene.level} />
          <span className="ml-auto"><DurationLabel duration={scene.duration} /></span>
        </div>
      </div>
    </Link>
  );
}

// ─── Desktop nav — dark forest green ─────────────────────────────────────────

function isNavActive(pathname: string, path: string) {
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

function DesktopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center px-8 gap-10" style={{ backgroundColor: "#184C3A" }}>
      <Link to="/" className="flex-shrink-0 flex items-center">
        <ImageWithFallback
          src={yzEnglishLogo}
          alt="Yz English — Real English for Real Life"
          className="object-contain lg:h-[56px] h-[46px]"
          style={{ width: "auto" }}
        />
      </Link>
      {([["/", "Home"], ["/explore", "Explore"], ["/resources", "Resources"], ["/about", "About"]] as [string, string][]).map(([path, label]) => {
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
    </nav>
  );
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────

function MobileNav() {
  const { pathname } = useLocation();
  const items = [
    { label: "Home", path: "/", Icon: Home },
    { label: "Explore", path: "/explore", Icon: Grid },
    { label: "Resources", path: "/resources", Icon: FileText },
    { label: "About", path: "/about", Icon: Info },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border h-16 flex shadow-lg">
      {items.map(({ label, path, Icon }) => {
        const active = isNavActive(pathname, path);
        return (
          <Link key={label} to={path} className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
            <div className={`flex items-center justify-center w-9 h-6 rounded-full transition-colors ${active ? "bg-primary/10" : ""}`}>
              <Icon size={19} className={active ? "text-primary" : "text-muted-foreground"} strokeWidth={active ? 2.5 : 1.75} />
            </div>
            <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

function HomePage() {
  const recentScenes = SCENES.filter(s => s.isNew);

  return (
    <div>

      {/* ════════════════════════════════════════
          HERO — off-white, bold, editorial
          ════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4 pt-10 pb-6 md:pt-14 md:pb-12 md:flex md:items-start md:gap-14">

          <div className="md:flex-1 md:max-w-[540px]">
            {/* Lime pill badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>
              Real English for Real Life · 真实生活英语
            </span>
            {/* Subtle speech-bubble outline — brand DNA */}
            <div className="flex items-center gap-2 mb-4 opacity-30">
              <svg aria-hidden="true" width="20" height="16" viewBox="0 0 20 16" fill="none">
                <rect x="0.75" y="0.75" width="18.5" height="11.5" rx="5" stroke="#184C3A" strokeWidth="1.2" fill="none"/>
                <path d="M4 12.25 L2.5 15.5 L8 12.25" fill="#184C3A"/>
              </svg>
              <LimeLine width={28} opacity={1} />
            </div>

            <h1 className="text-[32px] md:text-[48px] font-black leading-[1.08] text-foreground mb-4">
              Prepare for real{" "}
              <span className="relative inline-block" style={{ isolation: "isolate" }}>
                <span className="relative" style={{ zIndex: 1 }}>English</span>
                {/* Hand-drawn marker underline — SVG sits below the text layer */}
                <svg
                  aria-hidden="true"
                  className="absolute left-[-2%] w-[104%] pointer-events-none"
                  style={{ bottom: "-0.28em", height: "0.28em", zIndex: -1 }}
                  viewBox="0 0 220 18"
                  fill="none"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 13.5 C28 10.2, 60 8.8, 92 9.6 C124 10.4, 158 12.8, 188 11.2 C200 10.6, 210 9.8, 216 9.2"
                    stroke="#B7F21D"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 15.5 C36 13.8, 80 13.2, 120 13.8 C155 14.3, 185 13.6, 214 12.8"
                    stroke="#B7F21D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.45"
                  />
                </svg>
              </span>
              {" "}situations<br className="hidden md:block" /> before they happen.
            </h1>

            <p className="text-sm font-semibold text-primary mt-2 mb-1">
              在真实场景发生之前，先看一遍、听一遍、练一遍。
            </p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed mb-7 max-w-md">
              For people living, working, studying, or travelling in English-speaking countries.
              Not a language course — a real-life situational preparation platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Btn variant="accent" size="lg" to="/explore">
                Explore Scenes <ArrowRight size={15} />
              </Btn>
              <Btn variant="secondary" size="lg" to="/explore">
                Browse Travel English
              </Btn>
            </div>
          </div>

          {/* Right: editorial collage — desktop only */}
          <div className="hidden md:block flex-shrink-0 self-start mt-2" style={{ width: "380px", position: "relative", height: "420px" }}>

            {/* ── Primary image — tall, left-anchored, slight clockwise tilt ── */}
            <div className="absolute overflow-hidden bg-secondary shadow-2xl"
              style={{ width: "210px", height: "300px", top: "16px", left: "0px", borderRadius: "20px", transform: "rotate(1.2deg)", boxShadow: "0 20px 48px rgba(24,76,58,0.18)" }}>
              <img
                src="https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=500&h=750&fit=crop&auto=format"
                alt="A customer browsing clothing in a store"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* ── Secondary image — top-right, counter-tilt ── */}
            <div className="absolute overflow-hidden bg-secondary"
              style={{ width: "148px", height: "148px", top: "0px", right: "0px", borderRadius: "16px", transform: "rotate(-1.8deg)", boxShadow: "0 8px 24px rgba(24,76,58,0.13)" }}>
              <img
                src="https://images.unsplash.com/photo-1516901408257-500ed7566e6a?w=300&h=300&fit=crop&auto=format"
                alt="Parent walking with child near school"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* ── Tertiary image — bottom-right, slightly overlapping secondary ── */}
            <div className="absolute overflow-hidden bg-secondary"
              style={{ width: "162px", height: "142px", top: "164px", right: "4px", borderRadius: "14px", transform: "rotate(0.6deg)", boxShadow: "0 10px 28px rgba(24,76,58,0.14)" }}>
              <img
                src="https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=400&h=320&fit=crop&auto=format"
                alt="Airport terminal travellers"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* ── Floating info badge ── */}
            <div className="absolute flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5"
              style={{ bottom: "24px", left: "140px", boxShadow: "0 6px 20px rgba(24,76,58,0.14)", minWidth: "164px", zIndex: 10 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#B7F21D" }}>
                <Play size={9} fill="#1E1F1C" style={{ color: "#1E1F1C", marginLeft: "1px" }} />
              </div>
              <div>
                <p className="text-[11px] font-black leading-none" style={{ color: "#184C3A" }}>Watch · Learn · Practise</p>
                <p className="text-[9px] mt-0.5 font-medium" style={{ color: "rgba(24,76,58,0.5)" }}>Real-life scenes</p>
              </div>
            </div>

            {/* ── Lime hand-drawn arc — top-left corner accent ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ top: "0px", left: "168px", width: "48px", height: "48px", zIndex: 5 }} viewBox="0 0 48 48" fill="none">
              <path d="M8 40 Q24 6 40 10" stroke="#B7F21D" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85"/>
              <circle cx="40" cy="10" r="3" fill="#B7F21D" opacity="0.7"/>
            </svg>

            {/* ── Small dot cluster — bottom-left ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ bottom: "60px", left: "8px", width: "36px", height: "36px", zIndex: 5 }} viewBox="0 0 36 36" fill="none">
              <circle cx="6" cy="6" r="3" fill="#B7F21D" opacity="0.6"/>
              <circle cx="18" cy="10" r="2" fill="#B7F21D" opacity="0.35"/>
              <circle cx="10" cy="20" r="1.5" fill="#184C3A" opacity="0.25"/>
            </svg>

            {/* ── Tiny sparkle — top-right ── */}
            <svg aria-hidden="true" className="absolute pointer-events-none" style={{ top: "130px", right: "168px", width: "20px", height: "20px", zIndex: 5 }} viewBox="0 0 20 20" fill="none">
              <path d="M10 2 L11.2 8.8 L18 10 L11.2 11.2 L10 18 L8.8 11.2 L2 10 L8.8 8.8 Z" fill="#B7F21D" opacity="0.8"/>
            </svg>
          </div>
        </div>

        {/* Mobile: horizontal scene photo strip */}
        <div className="md:hidden flex gap-3 overflow-x-auto px-4 pb-8 pt-3" style={{ scrollbarWidth: "none" }}>
          {[
            { url: "https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=320&h=200&fit=crop&auto=format", alt: "Clothing store return counter", label: "Shopping & Returns" },
            { url: "https://images.unsplash.com/photo-1516901408257-500ed7566e6a?w=320&h=200&fit=crop&auto=format", alt: "Parent with child at school", label: "School & Family" },
            { url: "https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=320&h=200&fit=crop&auto=format", alt: "Airport terminal", label: "Travel" },
            { url: "https://images.unsplash.com/photo-1545575950-59f935d6521c?w=320&h=200&fit=crop&auto=format", alt: "Drive-through food counter", label: "Food & Restaurants" },
          ].map(p => (
            <Link key={p.url} to="/explore" className="flex-shrink-0 w-44 text-left group">
              <div className="rounded-2xl overflow-hidden aspect-video mb-2 shadow-md bg-secondary">
                <img src={p.url} alt={p.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
              <p className="text-xs font-bold text-foreground">{p.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS — dark forest green
          ════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#184C3A" }} className="py-12 md:py-16">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] mb-8 md:mb-12" style={{ color: "rgba(183,242,29,0.6)" }}>
            How it works · 学习方式
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 relative">
            {[
              { num: "01", en: "Watch the situation", zh: "观看真实场景视频", desc: "Each scene opens with a short vertical video showing a realistic, everyday English situation before the conversation begins." },
              { num: "02", en: "Learn the conversation", zh: "逐句学习完整对话", desc: "Read the full bilingual dialogue, study key expressions, and build vocabulary — at your own pace, with no pressure." },
              { num: "03", en: "Practise before real life", zh: "开口练习，做好准备", desc: "Shadow the conversation line by line to build the confidence to handle the situation yourself when it actually happens." },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 md:block">
                <div className="md:mb-4 flex-shrink-0">
                  <span className="text-6xl md:text-7xl font-black leading-none select-none" style={{ color: "rgba(183,242,29,0.25)" }}>{s.num}</span>
                </div>
                <div className="pt-1 md:pt-0">
                  <p className="text-lg font-black text-white mb-1 leading-snug">{s.en}</p>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#B7F21D" }}>{s.zh}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED SCENES — off-white
          ════════════════════════════════════════ */}
      <section className="bg-background py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Featured scenes · 精选场景</p>
              <p className="text-2xl font-black text-foreground leading-tight">Real situations. Practise them first.</p>
            </div>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity flex-shrink-0 mb-1">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {SCENES.filter(s => s.featured).map(scene => (
              <SceneCard key={scene.id} scene={scene} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BROWSE BY LIFE SITUATION — light neutral
          ════════════════════════════════════════ */}
      <section className="bg-secondary border-y border-border py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Browse by life situation · 按生活任务</p>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity">
              View all scenes <ChevronRight size={13} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <Link key={cat} to="/explore"
                className="text-xs font-bold border border-border rounded-full px-4 py-2 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-150 text-foreground">
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          RECENTLY ADDED — off-white
          ════════════════════════════════════════ */}
      <section className="bg-background border-b border-border py-10 md:py-14">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-0.5">Recently added · 最新场景</p>
              <p className="text-xl font-black text-foreground">New scenes this week</p>
            </div>
            <Link to="/explore" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity">
              See all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentScenes.map(scene => {
              const photo = SCENE_PHOTOS[scene.id];
              return (
                <Link key={scene.id} to={`/scenes/${scene.slug}`}
                  className="w-full flex items-center gap-4 rounded-2xl p-3 bg-card border border-border text-left hover:border-primary/25 hover:shadow-md transition-all duration-150">
                  <div className={`w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden ${photo ? "" : (CATEGORY_BG[scene.category] ?? "bg-secondary")}`}>
                    {photo ? (
                      <img src={photo.replace("w=700&h=480", "w=128&h=128")} alt={scene.titleEn} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <ImgBox label="" className="w-full h-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground leading-snug">{scene.titleEn}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{scene.titleZh}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{scene.category}</span>
                      <LevelBadge level={scene.level} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>New</span>
                    <DurationLabel duration={scene.duration} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PDF RESOURCES PREVIEW — neutral surface
          ════════════════════════════════════════ */}
      <section className="bg-secondary py-10">
        <div className="max-w-lg mx-auto md:max-w-5xl px-4">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">PDF resources · 学习资料</p>
              <p className="text-xl font-black text-foreground">Download and study offline</p>
            </div>
            <Link to="/resources" className="text-xs font-bold text-primary flex items-center gap-0.5 hover:opacity-70 transition-opacity flex-shrink-0 mb-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Scene PDFs, topic collections, and travel packs to study offline — no login required for free resources.
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              {PDF_RESOURCES.filter(r => r.free).slice(0, 2).map(r => (
                <div key={r.id} className="p-4">
                  <div className={`w-full h-20 rounded-xl mb-3 overflow-hidden ${CATEGORY_BG[r.category] ?? "bg-secondary"}`}>
                    <ImgBox label={r.category} className="w-full h-full" />
                  </div>
                  <p className="text-xs font-bold text-foreground leading-snug mb-0.5">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{r.titleZh}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.scenes} scenes · <span className="text-emerald-700 font-bold">Free</span></p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Btn variant="primary" to="/resources" className="w-full">
                <FileText size={14} />Browse all PDF resources
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER — very dark green
          ════════════════════════════════════════ */}
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
    </div>
  );
}

// ─── Explore page ─────────────────────────────────────────────────────────────

function ExplorePage({
  activeCategory, setActiveCategory,
  searchQuery, setSearchQuery,
}: {
  activeCategory: string; setActiveCategory: (c: string) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
}) {
  const [activeDiff, setActiveDiff] = useState("All");

  const filtered = SCENES.filter(s => {
    const cm = activeCategory === "All" || s.category === activeCategory;
    const dm = activeDiff === "All" || s.level === activeDiff;
    const qm = !searchQuery || s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) || s.titleZh.includes(searchQuery);
    return cm && dm && qm;
  });

  return (
    <div>
      {/* Header + search */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4">
        <h1 className="text-xl font-black text-foreground mb-0.5">Explore Real-Life Scenes</h1>
        <p className="text-xs text-muted-foreground mb-4">浏览真实生活场景 · {SCENES.length} scenes available</p>
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 bg-card shadow-sm focus-within:border-primary/50 transition-colors">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search: return, 退货, dentist, hotel…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Filters — light editorial strip */}
      <div style={{ backgroundColor: "#EDF3EE" }} className="border-b border-black/8">
        <div className="max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4 space-y-4">

          {/* Category */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Category · 分类</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150 whitespace-nowrap"
                  style={activeCategory === cat
                    ? { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" }
                    : { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.13em] mb-2.5" style={{ color: "#184C3A" }}>Level · 难度</p>
            <div className="flex flex-wrap gap-1.5">
              {["All", "A1–A2", "A2–B1", "B1–B2"].map(d => (
                <button key={d} onClick={() => setActiveDiff(d)}
                  className="text-xs font-semibold rounded-full px-3 py-1.5 border transition-all duration-150"
                  style={activeDiff === d
                    ? { backgroundColor: "#B7F21D", color: "#1E1F1C", borderColor: "#B7F21D" }
                    : { backgroundColor: "white", color: "#3A3B37", borderColor: "rgba(24,76,58,0.18)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Results count + clear */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4">
        <div className="py-3 flex items-center gap-3">
          <p className="text-xs font-semibold text-foreground">{filtered.length} scene{filtered.length !== 1 ? "s" : ""} found</p>
          {(activeCategory !== "All" || activeDiff !== "All" || searchQuery) && (
            <button onClick={() => { setActiveCategory("All"); setActiveDiff("All"); setSearchQuery(""); }}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2">
              Clear all
            </button>
          )}
        </div>
        <div className="pb-10">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(scene => <SceneCard key={scene.id} scene={scene} />)}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
              <Search size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No scenes found</p>
              <p className="text-xs mt-1">Try a different search or filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scene Detail page ────────────────────────────────────────────────────────

function SceneDetailPage({ bilingualMode, setBilingualMode }: {
  bilingualMode: boolean;
  setBilingualMode: (v: boolean) => void;
}) {
  const [shadowLine, setShadowLine] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);

  const EXPR_LABELS = ["OPENING", "EXPLAINING", "ASKING", "AGREEING", "STAFF PHRASE"];
  const FOUR_STAGES = [
    { num: "1", en: "Ask to return", zh: "提出退货" },
    { num: "2", en: "Explain the receipts", zh: "说明收据情况" },
    { num: "3", en: "Understand the options", zh: "了解退款方式" },
    { num: "4", en: "Complete the return", zh: "完成退货" },
  ];

  const CHAPTER_LABELS = [
    { num: "01", label: "Watch", sectionId: "section-watch" },
    { num: "02", label: "Dialogue", sectionId: "section-dialogue" },
    { num: "03", label: "Language", sectionId: "section-language" },
    { num: "04", label: "Practise", sectionId: "section-practise" },
  ];
  const TIP_TYPES = ["Must Know", "Practical Tip", "Good to Know"];

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const ids = CHAPTER_LABELS.map(ch => ch.sectionId);
    // Track which sections are currently intersecting
    const visibleSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });
        // Set active to the first visible section in order
        for (let i = 0; i < ids.length; i++) {
          if (visibleSections.has(ids[i])) {
            setActiveChapter(i);
            return;
          }
        }
      },
      {
        // Trigger when section enters the upper ~40% of the viewport
        rootMargin: "-100px 0px -55% 0px",
        threshold: 0,
      }
    );

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    // Offset: main nav h-14 (56px) + sticky chapter nav (~44px) + 8px buffer
    const offset = 64 + 44 + 8;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div>

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-1 text-[10px] text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={9} />
          <Link to="/explore" className="hover:text-primary transition-colors">Shopping & Returns</Link>
          <ChevronRight size={9} />
          <span className="text-foreground font-semibold">Returning Clothes at a Store</span>
        </div>
      </div>

      {/* ─── Lesson identity block (sits between breadcrumb and chapter nav) ─── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 pt-6 pb-5">
          <h1 className="text-[32px] md:text-[38px] font-black leading-tight text-foreground mb-0.5">
            Returning Clothes at a Store
          </h1>
          <p className="font-semibold mb-3" style={{ fontSize: "18px", color: "#184C3A" }}>在商店退衣服</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">Shopping & Returns</span>
            <LevelBadge level="A2–B1" />
            <DurationLabel duration="2 min" />
          </div>
        </div>
      </div>

      {/* ─── Sticky chapter nav ─── */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6">
          <div className="flex items-center gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {CHAPTER_LABELS.map((ch, i) => {
              const isActive = activeChapter === i;
              return (
                <button
                  key={i}
                  onClick={() => scrollToSection(ch.sectionId)}
                  className="flex items-center gap-2 flex-shrink-0 pr-5 py-3 border-b-2 border-transparent transition-colors cursor-pointer bg-transparent"
                  style={isActive
                    ? { borderBottomColor: "#B7F21D", color: "#184C3A" }
                    : { color: "var(--muted-foreground)" }
                  }
                >
                  <span className="text-[9px] font-black" style={{ color: isActive ? "#184C3A" : undefined }}>
                    {ch.num}
                  </span>
                  <span className="text-[11px] font-bold whitespace-nowrap">{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CENTRED CONTENT LAYOUT (no sidebar)
          ═══════════════════════════════════════════ */}
      <div className="pb-24">

        {/* ─────────────────────────────────────────────
            STAGE 01 · Watch & Understand
            ───────────────────────────────────────────── */}
        <section id="section-watch" className="max-w-[1000px] mx-auto px-4 md:px-6 pt-8 pb-14">

          {/* ── Section heading ── */}
          <div className="flex items-start gap-4 mb-6">
            <span className="text-[44px] md:text-[52px] font-black leading-none select-none flex-shrink-0 mt-0.5 tabular-nums" style={{ color: "rgba(24,76,58,0.1)" }}>01</span>
            <div className="pt-0.5">
              <p className="text-[24px] md:text-[28px] font-black leading-tight text-foreground">Watch & Understand</p>
              <p className="text-[15px] md:text-[16px] text-muted-foreground mt-1 leading-snug">Watch the scene, then read the setup and your goal.</p>
            </div>
          </div>

          {/* ── 16:9 video — primary action ── */}
          <div className="rounded-2xl overflow-hidden bg-gray-900 mb-8" style={{ aspectRatio: "16/9" }}>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <button className="w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4 transition-all hover:scale-105"
                style={{ borderColor: "rgba(183,242,29,0.5)", backgroundColor: "rgba(183,242,29,0.12)" }}>
                <Play size={22} className="ml-0.5" style={{ color: "#B7F21D" }} fill="currentColor" />
              </button>
              <p className="text-white/40 text-sm font-semibold">Returning Clothes at a Store</p>
              <p className="text-white/22 text-xs mt-1">16:9 · 2 min</p>
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <div className="w-full h-0.5 rounded-full mb-3" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <div className="h-full w-[28%] rounded-full" style={{ backgroundColor: "#B7F21D" }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[11px]">0:34 / 2:00</span>
                  <div className="flex items-center gap-3">
                    <Volume2 size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.2)", color: "#B7F21D" }}>CC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Scene Setup + Learning Goal — below video ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
            {/* Scene Setup */}
            <div className="rounded-xl border border-border bg-card px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2.5">Scene Setup · 场景说明</p>
              <p className="text-sm leading-[1.65] text-foreground">
                You want to return two items — a jacket and a sweater. You have a receipt for one but not the other.
              </p>
              <p className="text-[13px] mt-2.5 leading-[1.7]" style={{ color: "#3A3B37" }}>
                你要退两件商品——有收据的夹克和丢了收据的毛衣。
              </p>
            </div>
            {/* Learning Goal — highlight card with speech-bubble corner detail */}
            <div className="rounded-xl px-4 py-4 relative overflow-hidden" style={{ backgroundColor: "rgba(183,242,29,0.08)", border: "1px solid rgba(183,242,29,0.22)" }}>
              {/* Speech-bubble tail — bottom-left corner detail */}
              <svg aria-hidden="true" width="14" height="10" viewBox="0 0 14 10" fill="none"
                className="absolute bottom-2 left-4">
                <path d="M0 0 Q7 8 14 2" stroke="#B7F21D" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
              </svg>
              <div className="flex items-center gap-2 mb-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#184C3A" }}>Learning Goal · 学习目标</p>
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: "#B7F21D" }} />
              </div>
              <p className="text-sm font-semibold leading-[1.55] text-foreground">
                Handle a two-item return with different receipt situations.
              </p>
              <p className="text-[13px] mt-2.5 leading-[1.7]" style={{ color: "#3A3B37" }}>
                学会在一张有收据、一张没有的情况下完成退货。
              </p>
            </div>
          </div>

          {/* ── Save / Share ── */}
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" disabled><Bookmark size={12} />Save</Btn>
            <Btn variant="secondary" size="sm" disabled><Share2 size={12} />Share</Btn>
            <span className="text-[10px] text-muted-foreground/45 italic ml-1">Coming soon</span>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            STAGE 02 · Learn the Dialogue
            ───────────────────────────────────────────── */}
        <section id="section-dialogue" className="border-t border-border" style={{ backgroundColor: "#EFF4F1" }}>
          <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="rounded-2xl px-5 py-8 md:py-10" style={{ backgroundColor: "#EFF4F1" }}>
            <div className="flex items-start gap-5 mb-8">
              <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(24,76,58,0.09)" }}>02</span>
              <div className="pt-1">
                <p className="text-[32px] md:text-[36px] font-black leading-tight text-foreground">Learn the Dialogue</p>
                <SmileCurve width={80} opacity={0.55} className="mt-1 mb-1" />
                <p className="text-[16px] md:text-[17px] text-muted-foreground mt-0.5 leading-snug">Read line by line. Toggle bilingual mode for Chinese translations.</p>
              </div>
            </div>

            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-black/8">
              <button disabled className="flex items-center gap-2 text-xs font-bold rounded-xl px-4 py-2.5 opacity-50 cursor-default" style={{ backgroundColor: "#184C3A", color: "#F7F6F2" }}>
                <Play size={11} fill="currentColor" />Play full dialogue
              </button>

              {/* EN / 双语 toggle */}
              <div className="flex items-center border border-border rounded-full p-0.5 bg-white shadow-sm">
                <button onClick={() => setBilingualMode(false)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${!bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  style={!bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                  English
                </button>
                <button onClick={() => setBilingualMode(true)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  style={bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                  双语
                </button>
              </div>

              <span className="text-xs text-muted-foreground">{DIALOGUE.length} lines · 2 min</span>

              {/* Legend */}
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.22)", color: "#184C3A" }}>YOU</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">Customer · 顾客</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white border border-border text-muted-foreground">STAFF</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">Staff · 店员</span>
                </div>
              </div>
            </div>

            {/* Transcript rows */}
            <div>
              {DIALOGUE.map((line, i) => {
                const isYou = line.speaker === "You";
                return (
                  <div key={i}
                    className="flex items-start gap-4 py-4 border-b border-black/6 last:border-0 hover:bg-white/70 transition-colors rounded-lg px-3 -mx-3"
                    style={{ borderLeft: `3px solid ${isYou ? "rgba(183,242,29,0.6)" : "transparent"}` }}>

                    {/* Speech-bubble speaker label */}
                    <SpeechBubbleLabel isYou={isYou} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground leading-[1.65]" style={{ fontSize: "17px" }}>{line.en}</p>
                      {bilingualMode && (
                        <p className="mt-2 leading-[1.75]" style={{ fontSize: "15px", color: "#3A3B37" }}>{line.zh}</p>
                      )}
                    </div>

                    {/* Audio */}
                    <button disabled className="flex-shrink-0 w-7 h-7 rounded-full border border-border bg-white flex items-center justify-center opacity-25 cursor-default mt-1">
                      <Volume2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>{/* inner card */}
          </div>{/* inner container */}
        </section>

        {/* ─────────────────────────────────────────────
            STAGE 03 · Learn the Language
            ───────────────────────────────────────────── */}
        <section id="section-language" className="border-t border-border bg-card">
          <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="bg-card px-0">
            <div className="flex items-start gap-5 mb-8">
              <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(24,76,58,0.06)" }}>03</span>
              <div className="pt-1">
                <p className="text-[32px] md:text-[36px] font-black leading-tight text-foreground">Learn the Language</p>
                <LimeLine width={56} opacity={0.6} className="mt-1.5 mb-1" />
                <p className="text-[16px] md:text-[17px] text-muted-foreground mt-0.5 leading-snug">Key expressions, vocabulary, and cultural notes from this scene.</p>
              </div>
            </div>

            {/* Key Expressions — 2-col grid */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-0.5 h-4 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Key Expressions · 重点表达</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EXPRESSIONS.map((exp, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden bg-background">
                    <div className="px-4 pt-4 pb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2.5 inline-block" style={{ backgroundColor: "rgba(183,242,29,0.2)", color: "#184C3A" }}>
                        {EXPR_LABELS[i]}
                      </span>
                      <p className="text-[15px] font-bold text-foreground leading-snug mt-1">{exp.en}</p>
                      <p className="text-sm text-primary font-semibold mt-1">{exp.zh}</p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-border flex items-center gap-3" style={{ backgroundColor: "rgba(183,242,29,0.07)" }}>
                      <p className="text-[11px] text-muted-foreground italic flex-1 leading-relaxed">{exp.note}</p>
                      <button disabled className="w-6 h-6 rounded-full border border-border bg-white flex items-center justify-center opacity-25 cursor-default flex-shrink-0">
                        <Volume2 size={9} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vocabulary — collapsible */}
            <div className="mb-4">
              <Collapsible label="Vocabulary · 重点词汇" defaultOpen={false}>
                <div className="mt-2 divide-y divide-border">
                  {VOCABULARY.map((v, i) => (
                    <div key={i} className="flex items-start gap-3 py-3 first:pt-1">
                      <div className="flex-shrink-0 w-40">
                        <span className="text-sm font-bold text-foreground">{v.word}</span>
                        {v.phonetic && <span className="text-[10px] text-muted-foreground font-mono ml-1.5">{v.phonetic}</span>}
                        <span className="text-[10px] text-muted-foreground italic ml-1">{v.pos}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{v.zh}</p>
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">"{v.example}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>
            </div>

            {/* Culture & Local Tips */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-0.5 h-4 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Culture & Local Tips · 文化与本地提示</span>
              </div>
              <SmileCurve width={48} opacity={0.45} className="mb-4 -mt-1" />
              <div className="space-y-3">
                {TIPS.map((tip, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(24,76,58,0.13)", backgroundColor: "rgba(24,76,58,0.025)" }}>
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "rgba(24,76,58,0.09)" }}>
                      <Info size={13} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground">{tip.title}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(183,242,29,0.18)", color: "#184C3A" }}>
                            {TIP_TYPES[i % TIP_TYPES.length]}
                          </span>
                        </div>
                        <p className="text-[14px] mt-0.5 leading-snug" style={{ color: "#184C3A", opacity: 0.75 }}>{tip.titleZh}</p>
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-sm leading-[1.7] text-foreground">{tip.body}</p>
                      <p className="mt-3 leading-[1.75]" style={{ fontSize: "15.5px", color: "#3A3B37" }}>{tip.bodyZh}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>{/* inner card */}
          </div>{/* inner container */}
        </section>

        {/* ─────────────────────────────────────────────
            STAGE 04 · Practise & Continue
            dark forest green — shadowing only
            ───────────────────────────────────────────── */}
        <section id="section-practise" className="border-t border-black/8" style={{ backgroundColor: "#184C3A" }}>
          <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">

            {/* Stage header */}
            <div className="flex items-start gap-5 mb-10">
              <span className="text-[56px] md:text-[64px] font-black leading-none select-none flex-shrink-0 mt-1 tabular-nums" style={{ color: "rgba(183,242,29,0.12)" }}>04</span>
              <div className="pt-1">
                <p className="text-[32px] md:text-[36px] font-black text-white leading-tight">Practise & Continue</p>
                <SmileCurve width={96} opacity={0.45} className="mt-1 mb-1" />
                <p className="text-[16px] md:text-[17px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>Say each line out loud. Match the rhythm and intonation.</p>
              </div>
            </div>

            {/* Shadowing label */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: "rgba(183,242,29,0.55)" }} />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "rgba(183,242,29,0.6)" }}>Shadowing Practice · 跟读练习</span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold flex-shrink-0" style={{ color: "rgba(183,242,29,0.8)" }}>
                Line {shadowLine + 1} of {DIALOGUE.length}
              </span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((shadowLine + 1) / DIALOGUE.length) * 100}%`, backgroundColor: "#B7F21D" }} />
              </div>
            </div>

            {/* Current line — hand-drawn left accent + speech-bubble label */}
            <div className="rounded-xl p-5 mb-3 relative" style={{ backgroundColor: "rgba(183,242,29,0.07)", border: "1px solid rgba(183,242,29,0.18)" }}>
              {/* Hand-drawn active-line marker on left edge */}
              <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full" style={{ backgroundColor: "#B7F21D", opacity: 0.7 }} />
              <div className="flex items-center gap-3 mb-3">
                <SpeechBubbleLabel isYou={DIALOGUE[shadowLine].speaker === "You"} light />
                {/* Lime dot — pulse-like brand accent */}
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#B7F21D", opacity: 0.7 }} />
                <span className="text-[9px] font-semibold" style={{ color: "rgba(183,242,29,0.5)" }}>Say it out loud</span>
              </div>
              <p className="font-bold text-white leading-[1.65]" style={{ fontSize: "18px" }}>{DIALOGUE[shadowLine].en}</p>
              {bilingualMode && (
                <p className="mt-2.5 leading-[1.75]" style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)" }}>{DIALOGUE[shadowLine].zh}</p>
              )}
            </div>

            {/* Next line preview */}
            {shadowLine + 1 < DIALOGUE.length && (
              <div className="rounded-xl px-5 py-3 mb-6" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Next</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{DIALOGUE[shadowLine + 1].en}</p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2 mb-5">
              <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-50 cursor-default" style={{ backgroundColor: "rgba(183,242,29,0.15)", color: "#B7F21D", border: "1px solid rgba(183,242,29,0.2)" }}>
                <Play size={11} fill="currentColor" />Listen
              </button>
              <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-40 cursor-default" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Slow
              </button>
              <button disabled className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 opacity-50 cursor-default ml-auto" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Mic size={11} />Practise
              </button>
            </div>

            {/* Prev / Next line */}
            <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <button onClick={() => setShadowLine(l => Math.max(0, l - 1))}
                disabled={shadowLine === 0}
                className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition-opacity disabled:opacity-25"
                style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <ChevronLeft size={13} />Previous
              </button>
              {/* Smile-curve completion feedback — visible on last line */}
              {shadowLine === DIALOGUE.length - 1 && (
                <div className="flex flex-col items-center gap-1">
                  <SmileCurve width={40} opacity={0.6} />
                  <span className="text-[9px] font-bold" style={{ color: "rgba(183,242,29,0.6)" }}>Done!</span>
                </div>
              )}
              <button onClick={() => setShadowLine(l => Math.min(DIALOGUE.length - 1, l + 1))}
                disabled={shadowLine === DIALOGUE.length - 1}
                className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-4 py-2 transition-opacity disabled:opacity-25"
                style={{ backgroundColor: "rgba(183,242,29,0.15)", color: "#B7F21D", border: "1px solid rgba(183,242,29,0.28)" }}>
                Next line <ChevronRight size={13} />
              </button>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────
            LIGHT SECTION: PDF · Related · Prev/Next
            ───────────────────────────────────────────── */}
        <section className="border-t border-border bg-background">
          <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12">

            {/* PDF download */}
            <div className="flex items-center gap-4 border border-border rounded-2xl bg-card px-5 py-4 mb-10 shadow-sm">
              <div className="w-10 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(183,242,29,0.15)" }}>
                <FileText size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-snug">Returning Clothes at a Store — PDF</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dialogue · Expressions · Vocabulary · Culture tips · Free</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-black rounded-xl px-4 py-2.5 transition-opacity hover:opacity-90 flex-shrink-0" style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>
                <Download size={11} />Download
              </button>
            </div>

            {/* Related Scenes */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-0.5 h-4 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Related Scenes · 相关场景</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {RELATED.map(r => (
                  <Link key={r.id} to={`/scenes/${SCENES.find(s => s.id === r.id)?.slug ?? ""}`}
                    className="flex items-start gap-3 border border-border rounded-xl p-3.5 bg-card text-left hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className={`w-10 h-10 rounded-lg flex-shrink-0 ${CATEGORY_BG[r.category] ?? "bg-secondary"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-snug">{r.titleEn}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.titleZh}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <LevelBadge level={r.level} />
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Prev / Next scene */}
            <div className="grid grid-cols-2 gap-3 pt-8 border-t border-border">
              <Link to={`/scenes/${SCENES.find(s => s.id === 5)?.slug ?? ""}`} className="border border-border rounded-xl p-4 text-left bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                  <ChevronLeft size={10} />Previous scene
                </div>
                <p className="text-xs font-bold text-foreground leading-snug">Ordering at a Drive-Through</p>
                <p className="text-[11px] text-primary mt-1">得来速点餐</p>
              </Link>
              <Link to={`/scenes/${SCENES.find(s => s.id === 3)?.slug ?? ""}`} className="border border-border rounded-xl p-4 text-right bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground mb-2">
                  Next scene<ChevronRight size={10} />
                </div>
                <p className="text-xs font-bold text-foreground leading-snug">Booking a Dentist Appointment</p>
                <p className="text-[11px] text-primary mt-1">预约牙医</p>
              </Link>
            </div>

          </div>
        </section>

      </div>{/* end pb-24 wrapper */}
    </div>
  );
}


// ─── PDF Resources page ───────────────────────────────────────────────────────

function PDFResourcesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const TYPE_FILTERS = ["All", "Free", "Scene PDFs", "Topic Collections", "Travel", "Country-Specific"];

  const PDF_TYPE_STYLE: Record<string, string> = {
    scene: "bg-primary/10 text-primary",
    collection: "bg-purple-100 text-purple-800",
    travel: "bg-amber-100 text-amber-800",
    country: "bg-emerald-100 text-emerald-800",
    free: "bg-emerald-100 text-emerald-800",
  };

  const filtered = PDF_RESOURCES.filter(r => {
    if (freeOnly && !r.free) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.titleZh.includes(searchQuery)) return false;
    if (activeFilter === "Free") return r.free;
    if (activeFilter === "Scene PDFs") return r.type === "scene";
    if (activeFilter === "Topic Collections") return r.type === "collection";
    if (activeFilter === "Travel") return r.type === "travel";
    if (activeFilter === "Country-Specific") return r.type === "country";
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pt-5 pb-4">
        <h1 className="text-xl font-black text-foreground mb-0.5">PDF Resources</h1>
        <p className="text-sm text-muted-foreground mb-1">学习资料下载 · Scene PDFs · Topic Collections · Travel Packs</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">Download materials to study offline. Free resources need no login.</p>
        <div className="flex items-center gap-2.5 border border-border rounded-xl px-3.5 py-2.5 bg-card shadow-sm focus-within:border-primary/50 transition-colors">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search resources…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {searchQuery && <button onClick={() => setSearchQuery("")}><X size={14} className="text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Filters — dark green */}
      <div style={{ backgroundColor: "#184C3A" }} className="border-b border-black/20">
        <div className="max-w-lg mx-auto md:max-w-4xl px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TYPE_FILTERS.map(t => (
              <CategoryPill key={t} active={activeFilter === t} onClick={() => setActiveFilter(t)} darkMode>{t}</CategoryPill>
            ))}
          </div>
        </div>
      </div>

      {/* Free-only + count */}
      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 py-3 flex items-center gap-3">
        <button onClick={() => setFreeOnly(!freeOnly)}
          className={`flex items-center gap-1.5 text-xs font-bold border rounded-full px-3 py-1.5 transition-all ${
            freeOnly ? "text-accent-foreground border-accent" : "bg-card border-border hover:border-primary hover:text-primary"
          }`}
          style={freeOnly ? { backgroundColor: "#B7F21D", borderColor: "#B7F21D", color: "#1E1F1C" } : {}}>
          Free only
        </button>
        <span className="text-xs text-muted-foreground">{filtered.length} resource{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-background max-w-lg mx-auto md:max-w-4xl px-4 pb-10">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-200">
                {/* Card header */}
                <div className={`relative h-28 flex flex-col items-center justify-center gap-2 ${CATEGORY_BG[r.category] ?? "bg-secondary"}`}>
                  <FileText size={26} className="text-foreground/15" />
                  <span className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${PDF_TYPE_STYLE[r.type] ?? "bg-secondary text-muted-foreground"}`}>
                    {PDF_TYPE_LABELS[r.type]}
                  </span>
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${
                    r.free ? "" : "bg-card text-muted-foreground border border-border"
                  }`}
                  style={r.free ? { backgroundColor: "#B7F21D", color: "#1E1F1C" } : {}}>
                    {r.free ? "Free" : "Premium"}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-bold text-foreground leading-snug">{r.title}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{r.titleZh}</p>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">{r.desc}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">{r.scenes} scene{r.scenes !== 1 ? "s" : ""}</span>
                    <Btn variant={r.free ? "accent" : "secondary"} size="sm">
                      <Download size={11} />{r.free ? "Download" : "Get Access"}
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl text-muted-foreground">
            <p className="text-sm font-semibold">No resources found</p>
            <p className="text-xs mt-1">Try adjusting the filters above</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Design System reference page ────────────────────────────────────────────

function Swatch({ bg, label, value, style }: { bg: string; label: string; value: string; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`w-full h-12 rounded-xl border border-border ${bg}`} style={style} />
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{value}</p>
    </div>
  );
}

function AboutPage() {
  const METHOD_STEPS = [
    { num: "01", en: "Watch the real-life scene", zh: "观看真实场景", desc: "See what actually happens — from the opening line to the final exchange." },
    { num: "02", en: "Read the complete dialogue", zh: "学习完整对话", desc: "Follow every line with bilingual support and natural conversation flow." },
    { num: "03", en: "Learn useful expressions and context", zh: "掌握实用表达与场景信息", desc: "Understand the key phrases, cultural context, and how to use them naturally." },
    { num: "04", en: "Practise before real life", zh: "在真实场景发生前进行练习", desc: "Shadow the dialogue, rehearse your lines, and feel ready when the moment arrives." },
  ];

  const DIFFERENTIATORS = [
    { en: "Complete communication flows", zh: "完整的沟通流程" },
    { en: "Realistic, natural dialogue", zh: "真实自然的对话" },
    { en: "Bilingual English and Chinese support", zh: "双语英汉支持" },
    { en: "Practical speaking preparation", zh: "实用口语练习" },
    { en: "Everyday life and travel scenarios", zh: "日常生活与旅行场景" },
    { en: "Cultural and local context when relevant", zh: "相关文化与本地背景" },
    { en: "Searchable, structured scene library", zh: "可检索的场景内容库" },
  ];

  const WHO_FOR = [
    { en: "People living or settling abroad", zh: "在海外生活或定居的人" },
    { en: "Immigrants and newcomers", zh: "移民与新来者" },
    { en: "International students", zh: "留学生" },
    { en: "Parents managing school and family situations", zh: "需要处理学校与家庭事务的家长" },
    { en: "People working in English-speaking environments", zh: "在英语环境中工作的人" },
    { en: "International travellers", zh: "国际旅行者" },
    { en: "Intermediate learners wanting practical spoken English", zh: "希望提升实用口语的中级学习者" },
  ];

  return (
    <div>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-14 md:pt-16 md:pb-20">
          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}>
            About Yz English · 关于我们
          </span>
          <div className="md:grid md:grid-cols-[1fr_auto] md:gap-16 md:items-end">
            <div>
              <h1 className="text-[36px] md:text-[52px] font-black leading-[1.06] text-foreground mb-3">
                Real English for Real Life
              </h1>
              <p className="text-lg md:text-xl font-semibold mb-6" style={{ color: "#184C3A" }}>为真实生活准备的场景英语</p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mb-3">
                Yz English helps adult learners prepare for real English situations before they happen. Through realistic videos, complete conversations, useful expressions and speaking practice, learners can understand what may happen next and respond with more confidence.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8" style={{ color: "rgba(24,76,58,0.7)" }}>
                Yz English 帮助成年英语学习者提前预演真实生活中的英语场景。通过真实视频、完整对话、实用表达和口语练习，让学习者了解接下来可能发生什么，并更有信心地回应。
              </p>
              <div className="flex items-center gap-4">
                <Btn variant="accent" size="lg" to="/explore">
                  Explore Real-Life Scenes <ArrowRight size={15} />
                </Btn>
                {/* Speech-bubble brand accent — subtle outline */}
                <svg aria-hidden="true" width="32" height="28" viewBox="0 0 32 28" fill="none" opacity="0.3">
                  <rect x="1" y="1" width="30" height="20" rx="8" stroke="#184C3A" strokeWidth="1.5" fill="none"/>
                  <path d="M8 21 L5 27 L14 21" fill="#184C3A"/>
                </svg>
              </div>
            </div>
            {/* Accent graphic — desktop only */}
            <div className="hidden md:flex flex-col items-center gap-3 pb-2 flex-shrink-0">
              <div className="w-28 h-28 rounded-3xl flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: "#184C3A" }}>
                <span className="text-[32px] font-black leading-none" style={{ color: "#B7F21D" }}>Yz</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">English</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#B7F21D" }} />
                <span className="text-[10px] font-bold" style={{ color: "#184C3A" }}>Watch · Learn · Practise</span>
              </div>
              <SmileCurve width={48} opacity={0.4} className="mt-2 mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHY ══════════════════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-2 md:gap-16 md:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Why we built it</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-2">
                Why we created Yz English
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#184C3A" }}>为什么创建 Yz English</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Many learners know vocabulary and grammar — but still feel nervous in real situations. Not because their English is poor, but because they have never encountered that situation in English before.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                They don't know what the other person will say next. They don't know how the full process works. They haven't practised how to respond naturally. And they have never had the chance to prepare before an unfamiliar situation.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(24,76,58,0.75)" }}>
                许多学习者词汇和语法都没问题，但在真实场景中仍然感到紧张——因为他们从未用英语经历过那个情景。他们不知道对方接下来会说什么，也不知道整个流程是怎么进行的。Yz English 正是为此而生。
              </p>
              <div className="pt-2 border-l-2 pl-4" style={{ borderColor: "#B7F21D" }}>
                <p className="text-sm font-semibold text-foreground">Yz English gives learners a chance to see the situation first — so they can walk in prepared, not surprised.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ METHOD ════════════════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">The learning method</p>
          <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
            Watch. Understand. Practise.
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "#184C3A" }}>观看、理解、练习</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {METHOD_STEPS.map((step, idx) => (
              <div key={step.num} className="flex items-start gap-5 bg-card rounded-2xl border border-border px-5 py-5 shadow-sm relative overflow-hidden">
                <span className="text-[40px] font-black leading-none flex-shrink-0 tabular-nums select-none"
                  style={{ color: "rgba(24,76,58,0.1)" }}>{step.num}</span>
                <div className="pt-1 flex-1">
                  <p className="text-[15px] font-black text-foreground leading-snug">{step.en}</p>
                  <p className="text-sm font-semibold mt-0.5 mb-2" style={{ color: "#184C3A" }}>{step.zh}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
                  {/* Brand accent: smile on even steps, line on odd */}
                  {idx % 2 === 0
                    ? <SmileCurve width={40} opacity={0.4} className="mt-3" />
                    : <LimeLine width={32} opacity={0.5} className="mt-3" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHO ═══════════════════════════════════════════════════════════════ */}
      <section className="border-b border-border" style={{ backgroundColor: "#184C3A" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] mb-4" style={{ color: "rgba(183,242,29,0.6)" }}>Who it's for</p>
          <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-white mb-1">
            Made for real-life English learners
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "rgba(183,242,29,0.8)" }}>为真正需要使用英语的人设计</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {WHO_FOR.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#B7F21D" }} />
                <div>
                  <p className="text-sm font-semibold text-white">{item.en}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{item.zh}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DIFFERENT ═════════════════════════════════════════════════════════ */}
      <section className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-[1fr_1fr] md:gap-16 md:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">What makes it different</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
                More than phrases.<br />Complete situations.
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#184C3A" }}>不只是一句话，而是完整场景</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Most learning tools give you isolated phrases or grammar drills. Yz English shows you the full exchange — from the moment you walk in to the moment you walk out — so you know what to expect at every step.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(24,76,58,0.65)" }}>
                大多数学习工具只提供孤立的短语或语法练习。Yz English 呈现的是完整的沟通过程——从开口的第一句话，到最终完成交流——让你在每一步都知道该说什么。
              </p>
            </div>
            <div className="mt-8 md:mt-0 space-y-2.5">
              {DIFFERENTIATORS.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#B7F21D" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#1E1F1C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{d.en}</p>
                    <p className="text-xs" style={{ color: "rgba(24,76,58,0.6)" }}>{d.zh}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CONTENT APPROACH ═══════════════════════════════════════════════════ */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="md:grid md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Content approach</p>
              <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
                Built from real situations
              </h2>
              <p className="text-base font-semibold mb-6" style={{ color: "#184C3A" }}>内容来自真实生活</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Every Yz English scene starts from a real-world experience — the kind of situation learners actually face when living, working, studying, or travelling in an English-speaking environment.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(24,76,58,0.65)" }}>
                每一个 Yz English 场景都来源于真实的生活经历——学习者在英语环境中生活、工作、学习或旅行时，真正会遇到的情景。
              </p>
            </div>
            <div className="mt-8 md:mt-0">
              <div className="space-y-3">
                {[
                  { en: "Real overseas experiences", zh: "真实的海外生活经历" },
                  { en: "Everyday problems learners face", zh: "学习者日常遇到的实际问题" },
                  { en: "Questions from the audience", zh: "来自学习者的真实提问" },
                  { en: "Common travel and life situations", zh: "常见的旅行与生活场景" },
                  { en: "Situations people wish they had prepared for", zh: "那些人们事后希望自己提前准备过的情景" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(183,242,29,0.15)" }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="2.5" fill="#B7F21D"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.en}</p>
                      <p className="text-xs" style={{ color: "rgba(24,76,58,0.55)" }}>{item.zh}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VISION ════════════════════════════════════════════════════════════ */}
      <section className="border-b border-border" style={{ backgroundColor: "#EFF4F1" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-18">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-4">Brand vision</p>
            <h2 className="text-[26px] md:text-[32px] font-black leading-tight text-foreground mb-1">
              Our vision
            </h2>
            <p className="text-base font-semibold mb-8" style={{ color: "#184C3A" }}>我们的愿景</p>
            <SmileCurve width={72} opacity={0.55} className="mb-5" />
            <blockquote className="border-l-2 pl-6 mb-6" style={{ borderColor: "#B7F21D" }}>
              <p className="text-[17px] md:text-[19px] font-semibold text-foreground leading-relaxed">
                We want Yz English to become the place learners open before entering an unfamiliar English situation — whether they are going to a store, school, clinic, workplace, hotel or airport.
              </p>
            </blockquote>
            <p className="text-sm leading-relaxed pl-6" style={{ color: "rgba(24,76,58,0.7)", borderLeft: "2px solid rgba(183,242,29,0.3)" }}>
              我们希望 Yz English 成为学习者进入陌生英语场景之前，会主动打开并提前练习的平台——无论是去商店、学校、诊所、工作场所、酒店还是机场。
            </p>
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#184C3A" }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          {/* Hand-drawn lime accent */}
          <svg aria-hidden="true" className="mx-auto mb-6" width="60" height="20" viewBox="0 0 60 20" fill="none">
            <path d="M4 14 C15 9, 30 7, 45 10 C50 11, 56 12, 58 11" stroke="#B7F21D" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
          </svg>
          <h2 className="text-[28px] md:text-[38px] font-black leading-tight text-white mb-2">
            Prepare before it happens.
          </h2>
          <p className="text-base font-semibold mb-10" style={{ color: "rgba(183,242,29,0.8)" }}>
            在场景发生之前，先练一遍。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Btn variant="accent" size="lg" to="/explore">
              Explore Scenes <ArrowRight size={15} />
            </Btn>
            <Btn variant="ghost" size="lg" to="/resources"
              className="border border-white/20 text-white hover:bg-white/10">
              Browse Resources
            </Btn>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

export default function App() {
  const [bilingualMode, setBilingualMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <DesktopNav />
      <main className="pb-20 md:pb-0 md:pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/explore"
            element={
              <ExplorePage
                activeCategory={activeCategory} setActiveCategory={setActiveCategory}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              />
            }
          />
          <Route
            path="/scenes/:slug"
            element={<SceneDetailPage bilingualMode={bilingualMode} setBilingualMode={setBilingualMode} />}
          />
          <Route path="/resources" element={<PDFResourcesPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <MobileNav />
    </div>
  );
}
