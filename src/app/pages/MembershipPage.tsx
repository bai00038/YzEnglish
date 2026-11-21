import { MistakeNotebook } from "@/app/components/MistakeNotebook";
import { useMemberLearning } from "@/data/member-learning";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CalendarDays, Check, CheckCircle2, Clock3, Copy, Eye, EyeOff, LockKeyhole, Play, QrCode, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { MembershipUnlockModal } from "@/app/components/MembershipUnlockModal";
import { ErrorState, LoadingState } from "@/app/components/DataState";
import { getSceneProgressId, useAllLearningProgress, type LearningProgress } from "@/data/learning-progress";
import { membershipTypeLabel, useMembershipAccess, type MembershipUnlock } from "@/data/membership";
import { MEMBERSHIP_CODE_CHANGE_EVENT, MEMBERSHIP_CODE_STORAGE_KEY, maskMembershipDisplayCode, readMembershipDisplayCode } from "@/app/components/membership-code-display";
import { useScenes } from "@/data/scenes-access";
import type { Scene } from "@/data/types";
import { responsiveImageProps } from "@/data/responsive-image";

const DAY_MS = 24 * 60 * 60 * 1000;

function subscribeToDisplayCode(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === MEMBERSHIP_CODE_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(MEMBERSHIP_CODE_CHANGE_EVENT, listener);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(MEMBERSHIP_CODE_CHANGE_EVENT, listener); };
}

function displayCodeSnapshot() {
  try { return window.localStorage.getItem(MEMBERSHIP_CODE_STORAGE_KEY) ?? ""; } catch { return ""; }
}

export function MembershipCodeRow({ membership, onChange }: { membership: MembershipUnlock; onChange: () => void }) {
  const raw = useSyncExternalStore(subscribeToDisplayCode, displayCodeSnapshot, () => "");
  const code = readMembershipDisplayCode(raw, membership);
  const [revealedCode, setRevealedCode] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [copyError, setCopyError] = useState("");
  const visible = Boolean(code) && revealedCode === code;
  const copied = Boolean(code) && copiedCode === code;
  useEffect(() => {
    if (!copiedCode) return;
    const timer = window.setTimeout(() => setCopiedCode(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedCode]);
  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setCopyError("");
    } catch { setCopyError("复制未成功，请显示兑换码后手动复制"); }
  }
  return <div className="mt-5 text-[13px] text-muted-foreground">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="shrink-0">我的兑换码</span>
      <span className="min-w-0 break-all font-sans text-primary">{code ? (visible ? code : maskMembershipDisplayCode(code)) : "本浏览器未保存"}</span>
      <button type="button" disabled={!code} aria-label={visible ? "隐藏兑换码" : "显示兑换码"} aria-pressed={visible}
        onClick={() => setRevealedCode(visible ? "" : code)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-secondary disabled:opacity-35">
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button type="button" disabled={!code} aria-label={copied ? "已复制兑换码" : "复制兑换码"} onClick={() => { void copyCode(); }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary transition-colors hover:bg-secondary disabled:opacity-35">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button type="button" onClick={onChange} className="ml-auto shrink-0 py-2 font-semibold text-primary underline-offset-4 hover:underline">更换 →</button>
    </div>
    <p role="status" className={copyError ? "mt-1 text-xs" : "sr-only"}>{copyError || (copied ? "兑换码已复制" : "")}</p>
  </div>;
}

function formatExpiryDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function LearningSceneList({
  scenes,
  progressByScene,
  completed = false,
}: {
  scenes: Scene[];
  progressByScene: Record<string, LearningProgress>;
  completed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleScenes = expanded ? scenes : scenes.slice(0, 5);

  return (
    <div className="mt-4 overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_#12332508,0_10px_30px_#12332514]">
      {visibleScenes.map((scene, index) => {
        const progress = progressByScene[getSceneProgressId(scene)];
        const destination = completed ? `/scenes/${scene.slug}` : `/scenes/${scene.slug}?resume=1`;
        return (
          <Link
            key={scene.externalId ?? scene.id}
            to={destination}
            className={`group grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 p-3 transition-colors hover:bg-secondary/35 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4 sm:p-4 ${index > 0 ? "border-t border-border" : ""}`}
          >
            <div className="relative aspect-video overflow-hidden rounded-[12px] bg-[#E9E4DA]">
              {scene.photo ? (
                <img {...responsiveImageProps(scene.photo, "160px")} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" loading="lazy" decoding="async" />
              ) : (
                <span className="grid h-full w-full place-items-center text-white/85"><Play size={22} fill="currentColor" /></span>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 font-sans text-[17px] font-bold leading-tight text-primary sm:text-[18px]">{scene.titleZh || scene.titleEn}</h3>
                  <p className="mt-0.5 line-clamp-1 font-sans text-[12px] italic text-muted-foreground sm:text-[13px]">{scene.titleEn}</p>
                </div>
                {completed && <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white sm:text-xs">已学完</span>}
              </div>
              {!completed && (
                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>学习进度</span>
                    <span>{`${progress?.percent ?? 0}%`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${progress?.percent ?? 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          </Link>
        );
      })}
      {scenes.length > 5 && (
        <div className="border-t border-border px-4 py-3 text-center">
          <button type="button" onClick={() => setExpanded(value => !value)} className="text-xs font-bold text-primary transition-opacity hover:opacity-70">
            {expanded ? "收起" : `查看全部 ${scenes.length} 集 →`}
          </button>
        </div>
      )}
    </div>
  );
}

export function MembershipPage() {
  const { isUnlocked, isExpired, unlock } = useMembershipAccess();
  const { data: sceneData, loading: scenesLoading, error: scenesError } = useScenes();
  const progressByScene = useAllLearningProgress();
  const { phase } = useMemberLearning();
  const [modalOpen, setModalOpen] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);
  const remainingDays = unlock?.expiresAt
    ? Math.max(0, Math.ceil((new Date(unlock.expiresAt).getTime() - Date.now()) / DAY_MS))
    : null;
  const isExpiringSoon = isUnlocked && remainingDays !== null && remainingDays < 7;
  const scenesWithProgress = (sceneData ?? [])
    .map(scene => ({ scene, progress: progressByScene[getSceneProgressId(scene)] }))
    .filter((entry): entry is { scene: Scene; progress: LearningProgress } => Boolean(entry.progress?.percent))
    .sort((a, b) => b.progress.updatedAt.localeCompare(a.progress.updatedAt));
  const continueScenes = scenesWithProgress.filter(({ progress }) => progress.percent > 0 && progress.percent < 100).map(({ scene }) => scene);
  const completedScenes = scenesWithProgress.filter(({ progress }) => progress.percent >= 100).map(({ scene }) => scene);
  const hasLearningRecords = continueScenes.length > 0 || completedScenes.length > 0;

  return (
    <div className="bg-background pt-4 pb-7 md:pt-7 md:pb-10">
      <div className="mx-auto max-w-[1180px] px-3 md:px-8">
        <h1 className="flex flex-wrap items-baseline gap-x-2 font-zh-serif text-[24px] font-bold leading-[1.15] text-primary md:gap-x-2.5 md:text-[33px]">
          我的学习 <em className="font-serif text-[13px] font-normal text-[#6e6a5e] md:text-[17px]">My Learning</em>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">查看会员状态，继续上次的学习。</p>

        <section className="mt-7 overflow-hidden rounded-[22px] bg-card shadow-[0_1px_2px_#12332508,0_10px_30px_#12332514]">
          <div className="border-b border-border bg-secondary px-6 py-5 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${isUnlocked ? "bg-primary text-white" : isExpired ? "bg-[#A13D32]/10 text-[#A13D32]" : "bg-white text-muted-foreground"}`}>
                  {isUnlocked ? <ShieldCheck size={21} /> : <LockKeyhole size={20} />}
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">当前状态</p>
                  <p className={`mt-0.5 font-zh-serif text-xl font-bold ${isExpired ? "text-[#A13D32]" : "text-primary"}`}>
                    {isUnlocked ? "已解锁" : isExpired ? "已到期" : "未解锁"}
                  </p>
                </div>
              </div>
              {isUnlocked && <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-[#0F3527]"><CheckCircle2 size={14} /> 会员内容已开放</span>}
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_176px] md:p-8">
            <div>
              {!unlock ? (
                <div>
                <p className="font-zh-serif text-lg font-bold text-primary">当前状态：未解锁</p>
                <button type="button" onClick={() => setModalOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition-opacity hover:opacity-90">
                  输入兑换码解锁
                </button>
                <Link to="/#free" className="mt-4 block w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline">先免费学完 3 集再决定 →</Link>
                </div>
              ) : (
                <div>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[18px] bg-background/55 p-5">
                      <dt className="text-xs font-semibold text-muted-foreground">会员类型</dt>
                      <dd className="mt-2 font-zh-serif text-lg font-bold text-primary">{membershipTypeLabel(unlock.type)}</dd>
                    </div>
                    <div className="rounded-[18px] bg-background/55 p-5">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><CalendarDays size={14} /> 到期日</dt>
                      <dd className="mt-2 font-zh-serif text-lg font-bold text-primary">{unlock.type === "founder" ? "终身有效" : formatExpiryDate(unlock.expiresAt!)}</dd>
                    </div>
                    <div className="rounded-[18px] bg-background/55 p-5">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 size={14} /> 剩余时间</dt>
                      <dd className={`mt-2 font-zh-serif text-lg font-bold ${isExpired || isExpiringSoon ? "text-[#A13D32]" : "text-primary"}`}>
                        {unlock.type === "founder" ? "终身有效" : isExpired ? "已到期" : `剩余 ${remainingDays} 天`}
                      </dd>
                    </div>
                  </dl>
                  {isUnlocked && <MembershipCodeRow membership={unlock} onChange={() => setModalOpen(true)} />}
                  {isExpired && <button type="button" onClick={() => setModalOpen(true)} className="mt-5 py-2 text-[13px] font-semibold text-primary underline-offset-4 hover:underline">更换 →</button>}
                </div>
              )}
            </div>

            <aside className="flex items-center gap-4 border-t border-border pt-5 md:flex-col md:justify-center md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-center">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-white shadow-[0_1px_2px_#12332508,0_10px_30px_#12332514] p-0.5 md:h-28 md:w-28">
                {!qrMissing && <img src="/images/wecom-qr.png" alt="Aria 企业微信二维码" className="h-full w-full object-contain" onError={() => setQrMissing(true)} />}
                {qrMissing && <div className="text-center text-primary"><QrCode className="mx-auto h-8 w-8" /><span className="mt-1 block text-[9px] font-bold">二维码待替换</span></div>}
              </div>
              <div>
                <h2 className="font-sans text-base font-bold text-primary">需要帮助？</h2>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">扫码联系 Aria<br className="hidden md:block" /> 备注：YZ English 会员</p>
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-10">
          {scenesLoading ? <LoadingState label="正在读取学习记录…" /> : scenesError ? <ErrorState message={scenesError} /> : hasLearningRecords ? (
            <div className="space-y-10">
              {continueScenes.length > 0 && (
                <section aria-labelledby="my-continue-learning">
                  <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
                    <div>
                      <h2 id="my-continue-learning" className="font-sans text-[25px] font-bold text-primary">继续学习</h2>
                      <p className="mt-1 text-xs text-muted-foreground">按最近学习时间排列</p>
                    </div>
                    <span className="text-xs font-semibold text-secondary-foreground">共 {continueScenes.length} 集</span>
                  </div>
                  <LearningSceneList scenes={continueScenes} progressByScene={progressByScene} />
                </section>
              )}

              {completedScenes.length > 0 && (
                <section aria-labelledby="learning-history">
                  <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
                    <h2 id="learning-history" className="font-sans text-[25px] font-bold text-primary">学习历史</h2>
                    <span className="text-xs font-semibold text-secondary-foreground">共 {completedScenes.length} 集</span>
                  </div>
                  <LearningSceneList scenes={completedScenes} progressByScene={progressByScene} completed />
                </section>
              )}
            </div>
          ) : (
            <div className="rounded-[22px] bg-card shadow-[0_1px_2px_#12332508,0_10px_30px_#12332514] px-6 py-12 text-center">
              <Link to="/#free" className="font-zh-serif text-lg font-bold text-primary transition-opacity hover:opacity-70">还没开始学习，去免费体验 3 集 →</Link>
            </div>
          )}
          {isUnlocked && <MistakeNotebook />}
          <p className="mt-6 text-center text-xs text-muted-foreground" role="status">{isUnlocked ? phase === 'synced' ? '学习记录已同步到会员' : phase === 'offline' ? '暂未同步，网络恢复后会重试' : '正在同步学习记录…' : '学习记录保存在当前浏览器'}</p>
          <nav aria-label="关于与联系" className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground lg:hidden">
            <Link to="/about" className="inline-flex min-h-11 items-center hover:text-primary">关于</Link>
            <Link to="/contact" className="inline-flex min-h-11 items-center hover:text-primary">联系我们</Link>
          </nav>
        </div>
      </div>

      <MembershipUnlockModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
