import { LearningInfoRow } from "@/app/components/LearningInfoRow";
import { ContinueLearningSection } from "@/app/components/ContinueLearningSection";
import { MembershipExitDialog } from "@/app/components/MembershipExitDialog";
import { MembershipStatusCard } from "@/app/components/MembershipStatusCard";
import { PageHeading } from "@/app/components/PageHeading";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BookOpen, CheckCircle2, Mail, MessageCircle, Info } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { readMembershipCodeFragment } from "@/data/payments/membership-link";
import { MembershipUnlockModal } from "@/app/components/MembershipUnlockModal";
import { useMembershipAccess, type MembershipUnlock } from "@/data/membership";
import { MEMBERSHIP_CODE_CHANGE_EVENT, MEMBERSHIP_CODE_STORAGE_KEY, maskMembershipCardCode, readMembershipDisplayCode } from "@/app/components/membership-code-display";
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

export function MembershipCodeRow({ membership }: { membership: MembershipUnlock }) {
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
  return <>
    <div className="member-card-code">
      <div className="member-card-code-main"><small>我的兑换码</small><span className="member-card-code-value">{code ? (visible ? code : maskMembershipCardCode(code)) : "本浏览器未保存"}</span></div>
      <div className="member-card-code-ops">
        <button type="button" disabled={!code} aria-label={visible ? "隐藏兑换码" : "显示兑换码"} aria-pressed={visible} onClick={() => setRevealedCode(visible ? "" : code)}>{visible ? '隐藏' : '显示'}</button>
        <button type="button" disabled={!code} aria-label={copied ? "已复制兑换码" : "复制兑换码"} onClick={() => { void copyCode(); }}>{copied ? '已复制' : '复制'}</button>
      </div>
    </div>
    <p role="status" className={copyError ? "member-card-code-feedback" : "sr-only"}>{copyError || (copied ? "兑换码已复制" : "")}</p>
  </>;

}

export function MembershipPage() {
  const { isUnlocked, isExpired, unlock } = useMembershipAccess();
  const { continuing, completed, loading, error } = useLearningScenes();
  const { notebook: mistakes, learned } = useMemberLearning();
  const { hasUnread } = useMessages();
  const location = useLocation();
  const navigate = useNavigate();
  const [initialCode, setInitialCode] = useState(() => readMembershipCodeFragment(location.hash));
  const [modalOpen, setModalOpen] = useState(Boolean(initialCode));
  const [exitOpen, setExitOpen] = useState(false);
  useEffect(() => {
    const code = readMembershipCodeFragment(location.hash);
    if (!code) return;
    setInitialCode(code);setModalOpen(true);
    navigate(location.pathname + location.search, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);
  const hasWords = isUnlocked && (mistakes.length > 0 || learned.length > 0);
  const hasRecords = continuing.length > 0 || completed.length > 0 || hasWords;
  return <div className="learning-page learning-overview"><div className="learning-container">
    <div className="learning-title-row">
      <PageHeading subtitle="My Learning">我的学习</PageHeading>
      <Link to="/my-learning/messages" className="learning-mail" aria-label={hasUnread ? '消息中心，有未读消息' : '消息中心'}><Mail size={22} />{hasUnread && <span className="learning-dot" />}</Link>
    </div>
    <MembershipStatusCard isUnlocked={isUnlocked} isExpired={isExpired} membership={unlock} onUnlock={() => setModalOpen(true)} onExit={() => setExitOpen(true)}>
      {unlock && <MembershipCodeRow membership={unlock} />}
    </MembershipStatusCard>
    <ContinueLearningSection records={continuing} completedCount={completed.length} />
    {hasRecords && isUnlocked && <section className="learning-card learning-word-entrances" aria-label="单词">
      <Link to="/my-learning/vocabulary"><BookOpen size={21} /><strong>生词本</strong><span>{mistakes.length} 词 ›</span></Link>
      <Link to="/my-learning/learned"><CheckCircle2 size={21} /><strong>已学会</strong><span>{learned.length} 个 ›</span></Link>
    </section>}
    {continuing.length === 0 && completed.length > 0 && <Link className="learning-completed-link" to="/my-learning/completed">已学完 {completed.length} 集 ›</Link>}
    {!hasRecords && <p className="learning-empty">{loading ? '正在读取学习记录…' : error ? '学习记录暂时无法加载，请稍后刷新。' : '还没有学习记录，开始第一集吧。'}</p>}
    <section className="learning-card learning-word-entrances learning-info-entrances" aria-label="关于与联系">
      <LearningInfoRow to="/about" icon={Info} title="关于" description="了解这个网站和它的学习方法" />
      <LearningInfoRow to="/contact" icon={MessageCircle} title="联系我们" description="购买咨询、兑换码、会员问题，找我本人" />
    </section>
    <div className="learning-mobile-footer"><Link to="/about">关于</Link><span>·</span><Link to="/contact">联系我们</Link></div>
    <MembershipExitDialog open={exitOpen} onOpenChange={setExitOpen} />
    <MembershipUnlockModal key={initialCode} initialCode={initialCode} open={modalOpen} onOpenChange={setModalOpen} />
  </div></div>;
}
