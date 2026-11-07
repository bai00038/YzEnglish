import { useId, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, QrCode } from "lucide-react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { membershipErrorMessage, membershipTypeLabel, redeemMembershipCode } from "@/data/membership";
import { TEST_MODE } from "@/config/site";

export function MembershipUnlockPanel({ onUnlocked }: { onUnlocked?: () => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);
  const codeInputId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const unlock = await redeemMembershipCode(code);
      if (!unlock) {
        setIsSuccess(false);
        setMessage("兑换码无效或已过期，请联系我");
        return;
      }
      setIsSuccess(true);
      setMessage(`${membershipTypeLabel(unlock.type)}已解锁`);
      window.setTimeout(() => onUnlocked?.(), 450);
    } catch (error) {
      setIsSuccess(false);
      setMessage(membershipErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-3 text-left sm:gap-6 md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:gap-0">
      <section className="rounded-[18px] border border-primary/15 bg-white p-4 sm:rounded-[20px] sm:p-6 md:rounded-r-none md:p-8">
        <div className="flex items-center gap-2 text-primary">
          <LockKeyhole className="h-5 w-5" />
          <h3 className="font-zh-serif text-lg font-bold">已有兑换码</h3>
        </div>
        <form onSubmit={handleSubmit} className="mt-3 sm:mt-6">
          <label htmlFor={codeInputId} className="sr-only">兑换码</label>
          <input
            id={codeInputId}
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder="输入你的专属兑换码"
            autoComplete="off"
            className="h-11 w-full rounded-[14px] border border-border bg-background px-4 text-sm font-semibold uppercase tracking-[.06em] text-primary outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/45 sm:h-12"
          />
          <button type="submit" disabled={submitting} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-white transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-65 sm:mt-4 sm:h-12">
            {submitting ? "正在验证…" : "解锁"} {!submitting && <ArrowRight size={16} />}
          </button>
          {message && (
            <p role="status" className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${isSuccess ? "text-primary" : "text-[#A13D32]"}`}>
              {isSuccess && <CheckCircle2 size={14} />}{message}
            </p>
          )}
        </form>
        <p className="mt-3 border-t border-primary/10 pt-3 text-[11px] font-medium leading-5 text-muted-foreground sm:mt-7 sm:pt-5 sm:text-xs sm:leading-6">
          <strong className="font-bold text-primary">换设备了？</strong> 在新设备上重新输入同一个码，就能继续学。
        </p>
      </section>

      <section className="rounded-[18px] border border-primary/15 bg-secondary p-4 sm:rounded-[20px] sm:p-6 md:rounded-l-none md:border-l-0 md:p-8">
        {TEST_MODE ? (
          <div className="flex h-full min-h-0 flex-col justify-center sm:min-h-[280px]">
            <h3 className="font-zh-serif text-lg font-bold text-primary">测试阶段</h3>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-secondary-foreground sm:mt-3 sm:text-sm sm:leading-7">
              会员暂未开放购买。首页有 3 集免费体验，先学完看看合不合你的节奏，会员开放时会在粉丝群和公众号通知。有问题可以扫码添加 Aria 企业微信问我。
            </p>
            <figure className="mt-3 flex w-fit flex-col items-center sm:mt-5">
              <div className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-[12px] border border-primary/15 bg-white p-0.5 sm:h-32 sm:w-32 sm:rounded-[14px]">
                {!qrMissing && <img src="/images/wecom-qr.png" alt="企业微信二维码" className="h-full w-full object-contain" onError={() => setQrMissing(true)} />}
                {qrMissing && <div className="text-center text-primary"><QrCode className="mx-auto h-9 w-9" /><span className="mt-1 block text-[10px] font-bold">企业微信二维码<br />待替换</span></div>}
              </div>
              <figcaption className="mt-1.5 text-center text-[10px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-xs">
                扫码后请备注：<strong className="text-primary">YZ English 会员</strong>
              </figcaption>
            </figure>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-muted-foreground">还没有兑换码</p>
            <h3 className="mt-1.5 font-zh-serif text-xl font-bold text-primary sm:mt-3 sm:text-2xl">开通会员</h3>
            <p className="mt-2 text-xs leading-relaxed text-secondary-foreground sm:mt-4 sm:text-sm">会员可学全部场景：完整视频 + 逐句精听 + 配套讲义 PDF。</p>
            <div className="mt-2 overflow-hidden rounded-[14px] border border-primary/15 bg-white/55 text-xs font-black text-primary sm:mt-4 sm:text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-primary/10 px-4 py-2.5">
                <span>创始会员</span>
                <span className="whitespace-nowrap">¥199 终身（限 50 席）</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-primary/10 px-4 py-2.5">
                <span>年会员</span>
                <span className="whitespace-nowrap">¥99/年</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <span>月会员</span>
                <span className="whitespace-nowrap">¥12.9/月</span>
              </div>
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-secondary-foreground sm:mt-5 sm:text-sm sm:leading-8">
              ① 扫码添加 Aria 企业微信<br />
              ② 微信转账付款<br />
              ③ Aria 发你专属兑换码，回来输入即可解锁
            </p>
            <div className="mt-3 flex items-center gap-3 sm:mt-5 sm:gap-5">
              <div className="relative grid h-24 w-24 flex-none place-items-center overflow-hidden rounded-[12px] border border-primary/15 bg-white p-0.5 sm:h-32 sm:w-32 sm:rounded-[14px]">
                {!qrMissing && <img src="/images/wecom-qr.png" alt="企业微信二维码" className="h-full w-full object-contain" onError={() => setQrMissing(true)} />}
                {qrMissing && <div className="text-center text-primary"><QrCode className="mx-auto h-9 w-9" /><span className="mt-1 block text-[10px] font-bold">企业微信二维码<br />待替换</span></div>}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">扫码后请备注<br /><strong className="text-primary">YZ English 会员</strong></p>
            </div>
          </>
        )}
      </section>

      <Link to="/#free" className="inline-flex min-h-10 items-center justify-center gap-1 text-sm font-bold text-primary underline-offset-4 hover:underline md:col-span-2 md:mt-3">
        还没想好？先免费学完 3 集再决定 →
      </Link>
    </div>
  );
}

export function MembershipUnlockModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[100dvh] max-h-[100dvh] max-w-none content-start gap-3 overflow-y-auto overscroll-contain rounded-none border-0 px-4 pb-4 pt-3 sm:h-auto sm:max-h-[92vh] sm:max-w-[900px] sm:gap-6 sm:rounded-[26px] sm:border sm:p-8"
        closeButtonClassName="membership-modal-close right-2 top-2 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full bg-card/95 opacity-100 shadow-sm backdrop-blur-sm sm:right-4 sm:top-4 sm:h-10 sm:w-10 sm:bg-transparent sm:shadow-none"
      >
        <DialogHeader className="space-y-1 pr-12 sm:space-y-2 sm:pr-8">
          <DialogTitle className="font-zh-serif text-lg font-bold text-primary sm:text-xl">会员内容 · 输入兑换码解锁</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">一次解锁后会保存在当前浏览器，下次回来可继续学习。</DialogDescription>
        </DialogHeader>
        <MembershipUnlockPanel onUnlocked={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
