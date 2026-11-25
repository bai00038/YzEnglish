import { useRef, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from './ui/alert-dialog';
import { Btn } from './Btn';
import { logoutMembershipDevice } from '@/data/membership';
import { MEMBERSHIP_CODE_CHANGE_EVENT, MEMBERSHIP_CODE_STORAGE_KEY } from './membership-code-display';

export function MembershipExitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const inFlight = useRef(false);
  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;setBusy(true);setError('');
    try {
      await logoutMembershipDevice();
      try { localStorage.removeItem(MEMBERSHIP_CODE_STORAGE_KEY);window.dispatchEvent(new Event(MEMBERSHIP_CODE_CHANGE_EVENT)); } catch { /* Session is already released. */ }
      onOpenChange(false);
    } catch { setError('退出未成功，请检查网络后重试。'); }
    finally { inFlight.current = false;setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!busy) { setError('');onOpenChange(value); } }}>
    <AlertDialogContent className="member-exit-dialog">
      <AlertDialogTitle>退出本设备？</AlertDialogTitle>
      <AlertDialogDescription>退出后，这台设备将回到未解锁状态，并释放一个设备名额。你的会员码不受影响，随时输码就能重新解锁。</AlertDialogDescription>
      {error && <p role="status">{error}</p>}
      <div className="member-exit-dialog-actions">
        <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
        <Btn disabled={busy} onClick={() => { void confirm(); }}>{busy ? '正在退出…' : '确认退出'}</Btn>
      </div>
    </AlertDialogContent>
  </AlertDialog>;
}
