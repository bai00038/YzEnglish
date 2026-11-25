import { MEMBERSHIP_DEVICE_LIMIT } from '../membership-limits';
// Device count updated per the user's 3-device instruction. Other copy is verbatim.
// Verbatim from Downloads/配套页面文案.md, re-read on 2026-11-23.
export const refundPolicy = {
  title: '退款政策', subtitle: 'Refund Policy',
  introduction: 'Yz English 会员为数字内容服务，付款成功后会员码即时发放并开通。',
  items: [
    { title: '不支持无理由退款', body: '会员码一经发放，视为服务已交付，不接受因个人原因（如买错、暂时没有时间学习、自己的设备或网络问题等）的退款申请；使用问题可通过「联系我们」找我们协助排查。' },
    { title: '以下情况全额退款', body: '① 同一笔购买被重复扣款（多扣的一笔全额退回）；② 付款成功后未收到会员码或无法开通，且我们无法解决。' },
    { title: '开通后遇到平台故障', body: '我们会先修复，并按无法使用的天数顺延你的会员有效期；如因平台原因连续超过 7 天完全无法使用且无法修复，按剩余有效期比例退款。' },
    { title: '申请方式', body: '通过网站「联系我们」联系我们并提供购买邮箱，我们核实后通过原支付方式退回，一般 5–10 个工作日到账（以银行处理时间为准）。' },
  ],
};
export const serviceTerms = {
  title: '服务条款', subtitle: 'Terms of Service', introduction: '',
  items: [
    { title: '服务内容', body: 'Yz English 会员提供全站场景视频、精听／听写、讲义 PDF 下载与锦囊库的使用权。' },
    { title: '有效期', body: '年卡自付款成功之日起 1 年，双年卡 2 年。到期后由用户手动续费，本站不自动扣款。' },
    { title: '使用规则', body: `会员码仅限购买者本人使用，最多同时在 ${MEMBERSHIP_DEVICE_LIMIT} 台设备上使用；不得转借、转售或分享会员码。` },
    { title: '内容版权', body: '本站全部视频、讲义与文字内容版权归 Yz English 所有，仅供会员个人学习使用；不得下载传播、公开播放、用于直播教学或任何商业用途。' },
    { title: '服务变更', body: '我们会持续更新内容；如服务发生重大变更，将提前在站内公告。' },
    { title: '联系我们', body: '使用中遇到问题，请通过网站「联系我们」与我们联系。' },
  ],
};
