import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { MembershipUnlockModal } from "@/app/components/MembershipUnlockModal";
import { membershipTypeLabel, useMembershipAccess } from "@/data/membership";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatExpiryDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function MembershipPage() {
  const { isUnlocked, isExpired, unlock } = useMembershipAccess();
  const [modalOpen, setModalOpen] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);
  const remainingDays = unlock?.expiresAt
    ? Math.max(0, Math.ceil((new Date(unlock.expiresAt).getTime() - Date.now()) / DAY_MS))
    : null;
  const isExpiringSoon = isUnlocked && remainingDays !== null && remainingDays < 7;

  return (
    <div className="bg-background py-10 md:py-14">
      <div className="mx-auto max-w-[920px] px-5 md:px-8">
        <p className="editorial-kicker">Membership · 我的会员</p>
        <h1 className="mt-3 font-['Noto_Serif_SC'] text-[34px] font-bold leading-tight text-primary md:text-[44px]">我的会员</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">查看当前浏览器中的会员解锁状态。</p>

        <section className="mt-7 overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_18px_45px_rgba(18,36,28,.06)]">
          <div className="border-b border-border bg-secondary/55 px-6 py-5 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${isUnlocked ? "bg-primary text-white" : isExpired ? "bg-[#A13D32]/10 text-[#A13D32]" : "bg-white text-muted-foreground"}`}>
                  {isUnlocked ? <ShieldCheck size={21} /> : <LockKeyhole size={20} />}
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">当前状态</p>
                  <p className={`mt-0.5 font-['Noto_Serif_SC'] text-xl font-bold ${isExpired ? "text-[#A13D32]" : "text-primary"}`}>
                    {isUnlocked ? "已解锁" : isExpired ? "已到期" : "未解锁"}
                  </p>
                </div>
              </div>
              {isUnlocked && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"><CheckCircle2 size={14} /> 会员内容已开放</span>}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {!unlock ? (
              <div>
                <p className="font-['Noto_Serif_SC'] text-lg font-bold text-primary">当前状态：未解锁</p>
                <button type="button" onClick={() => setModalOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white transition-opacity hover:opacity-90">
                  输入兑换码解锁
                </button>
                <Link to="/#free" className="mt-4 block w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline">先免费学完 3 集再决定 →</Link>
              </div>
            ) : (
              <div>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-border bg-background/55 p-5">
                    <dt className="text-xs font-semibold text-muted-foreground">会员类型</dt>
                    <dd className="mt-2 font-['Noto_Serif_SC'] text-lg font-bold text-primary">{membershipTypeLabel(unlock.type)}</dd>
                  </div>
                  <div className="rounded-[18px] border border-border bg-background/55 p-5">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><CalendarDays size={14} /> 到期日</dt>
                    <dd className="mt-2 font-['Noto_Serif_SC'] text-lg font-bold text-primary">{unlock.type === "founder" ? "终身有效" : formatExpiryDate(unlock.expiresAt!)}</dd>
                  </div>
                  <div className="rounded-[18px] border border-border bg-background/55 p-5">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 size={14} /> 剩余时间</dt>
                    <dd className={`mt-2 font-['Noto_Serif_SC'] text-lg font-bold ${isExpired || isExpiringSoon ? "text-[#A13D32]" : "text-primary"}`}>
                      {unlock.type === "founder" ? "终身有效" : isExpired ? "已到期" : `剩余 ${remainingDays} 天`}
                    </dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setModalOpen(true)} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-primary/20 bg-white px-6 text-sm font-bold text-primary transition-colors hover:bg-secondary">
                  重新输入兑换码
                </button>
                <p className="mt-4 max-w-[620px] text-xs leading-6 text-muted-foreground">会员状态保存在当前浏览器；换设备时重新输入同一个码即可，到期日不变。</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 flex flex-col items-center rounded-[24px] border border-border bg-secondary/55 px-6 py-7 text-center md:flex-row md:justify-between md:px-8 md:text-left">
          <div>
            <h2 className="font-['Noto_Serif_SC'] text-xl font-bold text-primary">需要帮助？</h2>
            <p className="mt-2 text-sm text-secondary-foreground">有问题扫码联系 Aria，备注：YZ English 会员</p>
          </div>
          <div className="relative mt-5 grid h-36 w-36 place-items-center overflow-hidden rounded-[16px] border border-primary/15 bg-white p-0.5 md:mt-0">
            {!qrMissing && <img src="/images/wecom-qr.png" alt="Aria 企业微信二维码" className="h-full w-full object-contain" onError={() => setQrMissing(true)} />}
            {qrMissing && <div className="text-center text-primary"><QrCode className="mx-auto h-10 w-10" /><span className="mt-2 block text-[10px] font-bold">企业微信二维码<br />待替换</span></div>}
          </div>
        </section>
      </div>

      <MembershipUnlockModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
