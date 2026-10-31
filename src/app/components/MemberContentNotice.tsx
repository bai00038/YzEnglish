import { LockKeyhole } from "lucide-react";

export function MemberContentNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-[18px] border border-primary/15 bg-secondary text-primary ${compact ? "px-4 py-3" : "h-full min-h-[220px] justify-center px-6 py-10 text-center"}`}>
      <LockKeyhole className="h-5 w-5 flex-shrink-0" />
      <div className={compact ? "" : "text-left"}>
        <p className="font-['Noto_Serif_SC'] text-base font-bold">会员内容 · 开通会员后可学</p>
        {!compact && <p className="mt-1 text-sm text-muted-foreground">账号与会员系统接入后，这里会按会员状态自动开放。</p>}
      </div>
    </div>
  );
}
