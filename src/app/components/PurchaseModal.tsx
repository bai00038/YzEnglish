import { displayResourceTitle } from "@/data/resources";
import { formatRmbPrice } from "@/data/resource-collections";
import { WECHAT_QR_CODE_URL } from "@/data/purchase-contact";
import type { ResourceCollection } from "@/data/types";
import { Btn } from "@/app/components/Btn";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

// MVP purchase flow for paid resource collections: Get Access -> this modal,
// which shows the real WeChat QR code (configured once, as
// WECHAT_QR_CODE_URL, in src/data/purchase-contact.ts) -> buyer adds the
// seller on WeChat, naming the guide they want -> purchase and PDF delivery
// happen manually over WeChat. Deliberately never touches c.pdfUrl — the
// paid PDF lives in the private paid-resources Storage bucket and stays
// unreachable from the browser until a real purchase-verification flow
// exists. That future flow (payment -> verification -> a server-generated
// temporary signed URL) replaces only the Save QR Code action below; nothing
// else here needs to change for it.
export function PurchaseModal({ collection, onClose }: { collection: ResourceCollection | null; onClose: () => void }) {
  return (
    <Dialog open={!!collection} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        {collection && (
          <>
            <DialogHeader>
              <DialogTitle>Get the {displayResourceTitle(collection.titleEn)}</DialogTitle>
              <DialogDescription>{collection.descriptionEn}</DialogDescription>
            </DialogHeader>

            {collection.price != null && (
              <p className="text-2xl font-black text-foreground">{formatRmbPrice(collection.price)}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-5">
              {/* White padded frame keeps the code scannable regardless of
                  the app's theme; sized ~168px per the QR spec. */}
              <div className="mx-auto sm:mx-0 rounded-2xl border border-border bg-white p-4">
                <ImageWithFallback
                  src={WECHAT_QR_CODE_URL}
                  alt="WeChat QR code"
                  className="w-[168px] h-[168px] object-contain"
                />
              </div>

              <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
                <p className="text-sm font-bold text-foreground">微信扫码添加好友</p>
                <p className="text-sm text-muted-foreground">
                  添加好友时，请备注：
                  <br />
                  <span className="font-semibold text-foreground">{displayResourceTitle(collection.titleEn)}</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  Scan the QR code to add me on WeChat.
                  <br />
                  When adding me, please include the name of the guide you'd like to purchase.
                </p>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Btn variant="secondary" className="w-full sm:w-auto">Close</Btn>
              </DialogClose>
              {/* Plain anchor, not Btn: needs download/target/rel, which
                  Btn's Link-or-button API doesn't expose. Mobile-only
                  (hidden at the 641px desktop breakpoint, matching
                  MobileNav/DesktopNav): target="_blank" opens the QR
                  full-size so the user can long-press "Save Image", since
                  iOS Safari ignores `download`. Desktop users can already
                  right-click the QR image to save it. */}
              <a
                href={WECHAT_QR_CODE_URL}
                download="wechat-qr-code.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="min-[641px]:hidden inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none bg-accent text-accent-foreground hover:opacity-90 active:scale-95 text-sm px-4 py-2.5 w-full sm:w-auto"
              >
                保存二维码 / Save QR Code
              </a>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
