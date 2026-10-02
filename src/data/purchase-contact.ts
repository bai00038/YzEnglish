// Single source of truth for the WeChat QR code shown in the paid-resource
// purchase flow (see src/app/components/PurchaseModal.tsx). Nothing else in
// the app should hard-code this path.
//
// The image lives at public/wechat-qr-code.png — a public static asset, not
// a bundled import — so it can be swapped by replacing that file, without
// touching this code. It is currently the same real WeChat QR code shown on
// the /contact page. It must never be the paid PDF, and must never live in
// the private paid-resources Storage bucket.
export const WECHAT_QR_CODE_URL = "/wechat-qr-code.png";
