import { useId, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, QrCode } from "lucide-react";
import { Link } from "react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { membershipTypeLabel, redeemMembershipCode } from "@/data/membership";

export function MembershipUnlockPanel({ onUnlocked }: { onUnlocked?: () => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [qrMissing, setQrMissing] = useState(false);
  const codeInputId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unlock = await redeemMembershipCode(code);
    if (!unlock) {
      setIsSuccess(false);
      setMessage("兑换码无效或已过期，请联系我");
      return;
    }
    setIsSuccess(true);
    setMessage(`${membershipTypeLabel(unlock.type)}已解锁`);
    window.setTimeout(() => onUnlocked?.(), 450);
  }

  return (
    <div className="grid gap-6 text-left md:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] md:gap-0">
      <section className="rounded-[20px] border border-primary/15 bg-white p-6 md:rounded-r-none md:p-8">
        <div className="flex items-center gap-2 text-primary">
          <LockKeyhole className="h-5 w-5" />
          <h3 className="font-['Noto_Serif_SC'] text-lg font-bold">已有兑换码</h3>
        </div>
        <form onSubmit={handleSubmit} className="mt-6">
          <label htmlFor={codeInputId} className="sr-only">兑换码</label>
          <input
            id={codeInputId}
            value={code}
            onChange={event => setCode(event.target.value)}
            placeholder="输入你的专属兑换码"
            autoComplete="off"
            className="h-12 w-full rounded-[14px] border border-border bg-background px-4 text-sm font-semibold uppercase tracking-[.06em] text-primary outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/45"
          />
          <button type="submit" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-white transition-transform hover:scale-[1.01]">
            解锁 <ArrowRight size={16} />
          </button>
          {message && (
            <p role="status" className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${isSuccess ? "text-primary" : "text-[#A13D32]"}`}>
              {isSuccess && <CheckCircle2 size={14} />}{message}
            </p>
          )}
        </form>
        <p className="mt-7 border-t border-primary/10 pt-5 text-xs font-medium leading-6 text-muted-foreground">
          <strong className="font-bold text-primary">换设备了？</strong> 在新设备上重新输入同一个码，就能继续学。
        </p>
      </section>

      <section className="rounded-[20px] border border-primary/15 bg-secondary p-6 md:rounded-l-none md:border-l-0 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[.16em] text-muted-foreground">还没有兑换码</p>
        <h3 className="mt-3 font-['Noto_Serif_SC'] text-2xl font-bold text-primary">开通会员</h3>
        <p className="mt-4 text-sm leading-relaxed text-secondary-foreground">会员可学全部场景：完整视频 + 逐句精听 + 配套讲义 PDF。</p>
        <div className="mt-4 overflow-hidden rounded-[14px] border border-primary/15 bg-white/55 text-sm font-black text-primary">
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
        <p className="mt-5 text-sm font-bold leading-7 text-secondary-foreground">扫码添加 Aria 企业微信，付款后她发你专属兑换码，回来输入即可解锁。</p>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative grid h-32 w-32 flex-none place-items-center overflow-hidden rounded-[14px] border border-primary/15 bg-white p-1.5">
            {!qrMissing && <img src="/images/wecom-qr.png" alt="企业微信二维码" className="h-full w-full object-contain" onError={() => setQrMissing(true)} />}
            {qrMissing && <div className="text-center text-primary"><QrCode className="mx-auto h-9 w-9" /><span className="mt-1 block text-[10px] font-bold">企业微信二维码<br />待替换</span></div>}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">扫码后请备注<br /><strong className="text-primary">YZ English 会员</strong></p>
        </div>
      </section>

      <Link to="/#free" className="inline-flex items-center gap-1 text-sm font-bold text-primary underline-offset-4 hover:underline md:col-span-2 md:mt-3 md:justify-center">
        还没想好？先免费学完 3 集再决定 →
      </Link>
    </div>
  );
}

export function MembershipUnlockModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] max-w-none gap-6 overflow-y-auto rounded-none border-0 p-5 sm:h-auto sm:max-h-[92vh] sm:max-w-[900px] sm:rounded-[26px] sm:border sm:p-8">
        <DialogHeader className="space-y-2 pr-8">
          <DialogTitle className="font-['Noto_Serif_SC'] text-xl font-bold text-primary">会员内容 · 输入兑换码解锁</DialogTitle>
          <DialogDescription>一次解锁后会保存在当前浏览器，下次回来可继续学习。</DialogDescription>
        </DialogHeader>
        <MembershipUnlockPanel onUnlocked={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
