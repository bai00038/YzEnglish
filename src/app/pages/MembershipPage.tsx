import { ContinueLearningSection } from "@/app/components/ContinueLearningSection";
import { PageHeading } from "@/app/components/PageHeading";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BookOpen, Check, CheckCircle2, Copy, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router";
import { MembershipUnlockModal } from "@/app/components/MembershipUnlockModal";
import { useMembershipAccess, type MembershipUnlock } from "@/data/membership";
import { MEMBERSHIP_CODE_CHANGE_EVENT, MEMBERSHIP_CODE_STORAGE_KEY, maskMembershipDisplayCode, readMembershipDisplayCode } from "@/app/components/membership-code-display";
import { useMemberLearning } from "@/data/member-learning";
import { useMessages } from "@/data/messages";
import { useLearningScenes } from "@/app/components/LearningSceneRows";
import "@/styles/learning.css";

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

export function MembershipPage() {
  const { isUnlocked, isExpired, unlock } = useMembershipAccess();
  const { continuing, completed, loading, error } = useLearningScenes();
  const { notebook: mistakes, learned } = useMemberLearning();
  const { hasUnread } = useMessages();
  const [modalOpen, setModalOpen] = useState(false);
  const hasWords = isUnlocked && (mistakes.length > 0 || learned.length > 0);
  const hasRecords = continuing.length > 0 || completed.length > 0 || hasWords;
  return <div className="learning-page learning-overview"><div className="learning-container">
    <div className="learning-title-row">
      <PageHeading subtitle="My Learning">我的学习</PageHeading>
      <Link to="/membership/messages" className="learning-mail" aria-label={hasUnread ? '消息中心，有未读消息' : '消息中心'}><Mail size={22} />{hasUnread && <span className="learning-dot" />}</Link>
    </div>
    <section className="learning-card membership-status" aria-label="会员状态">
      <div className="membership-status-heading">
        <span className={`membership-shield ${isUnlocked ? 'unlocked' : ''}`}>{isUnlocked ? <Check size={17} strokeWidth={2.5} /> : <LockKeyhole size={17} />}</span>
        <strong>{isUnlocked ? '会员已开通' : isExpired ? '会员已到期' : '未解锁'}</strong>
        {unlock && <span className="membership-expiry">{unlock.expiresAt ? `至 ${new Date(unlock.expiresAt).toLocaleDateString('sv-SE')}` : '终身有效'}</span>}
      </div>
      {unlock ? <div className="membership-status-body">
        {isUnlocked ? <MembershipCodeRow membership={unlock} onChange={() => setModalOpen(true)} /> : <button className="learning-text-button" onClick={() => setModalOpen(true)}>更换 →</button>}
      </div> : <div className="membership-locked"><button onClick={() => setModalOpen(true)}>输入兑换码解锁</button><Link to="/#free">先免费学完 3 集再决定 →</Link></div>}
    </section>
    <ContinueLearningSection records={continuing} completedCount={completed.length} />
    {hasRecords && isUnlocked && <section className="learning-card learning-word-entrances" aria-label="单词">
      <Link to="/membership/vocabulary"><BookOpen size={21} /><strong>生词本</strong><span>{mistakes.length} 词 ›</span></Link>
      <Link to="/membership/learned"><CheckCircle2 size={21} /><strong>已学会</strong><span>{learned.length} 个 ›</span></Link>
    </section>}
    {continuing.length === 0 && completed.length > 0 && <Link className="learning-completed-link" to="/membership/completed">已学完 {completed.length} 集 ›</Link>}
    {!hasRecords && <p className="learning-empty">{loading ? '正在读取学习记录…' : error ? '学习记录暂时无法加载，请稍后刷新。' : '还没有学习记录，开始第一集吧。'}</p>}
    <div className="learning-mobile-footer"><Link to="/about">关于</Link><span>·</span><Link to="/contact">联系我们</Link></div>
    <MembershipUnlockModal open={modalOpen} onOpenChange={setModalOpen} />
  </div></div>;
}
