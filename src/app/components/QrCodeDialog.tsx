import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

export function QrCodeDialog({ src, title }: { src: string; title: string }) {
  return <Dialog>
    <DialogTrigger className="contact-add-button inline-flex items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[#174A36] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      查看二维码
    </DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[22px] text-center sm:max-w-[400px]">
      <DialogTitle className="pr-5 font-sans text-primary">{title}</DialogTitle>
      <img src={src} alt={`${title}原图`} className="mx-auto block h-auto max-h-[55dvh] w-full max-w-[320px] rounded-xl object-contain" />
      <DialogDescription className="font-sans leading-relaxed">长按保存二维码，再打开微信扫一扫，从相册中选择这张图片。</DialogDescription>
    </DialogContent>
  </Dialog>;
}
