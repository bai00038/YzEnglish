const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { deviceLimit: DEVICE_LIMIT } = require('../config/membership.json');
function membershipLink(origin, code) {
  // Fragment keeps the code out of server access logs and Referer headers.
  return `${origin}/my-learning#membership-code=${encodeURIComponent(code)}`;
}
function membershipMail(record, origin) {
  const link = membershipLink(origin, record.code);
  const expiry = new Date(record.expiresAt).toLocaleDateString('zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
  const title = record.renewed ? '续费成功，继续一起练习' : '欢迎加入，会员已开通';
  const lead = record.renewed ? '你的原会员码保持不变，有效期已顺延。' : '谢谢你的信任。你的会员码在下面，输入后就可以解锁全部场景，开始练习了。';
  const text = `Yz English\nReal scenes for real life.\n${title}\n${lead}\n你的会员码：${record.code}\n${record.planName} · 有效期至 ${expiry}\n1. 打开 ${origin}\n2. 进入「我的学习」\n3. 输入上面的会员码，即刻开始\n去输入会员码：${link}\n这个码最多同时在 ${DEVICE_LIMIT} 台设备上使用，请不要转发给他人。\n如果输入时遇到问题，在网站「联系我们」里找到我们，会尽快帮你处理。`;
  const html = `<div style="background:#E9E4D8;padding:24px 12px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#0F3527"><div style="max-width:480px;margin:auto;background:#F2EDE4;border-radius:18px;padding:28px 24px"><div style="font-size:18px;font-weight:700">Yz English</div><p style="color:#6F7C74">Real scenes for real life.</p><h1 style="font-size:24px">${escape(title)}</h1><p style="line-height:1.8;color:#42554B">${escape(lead)}</p><div style="background:white;border-radius:18px;padding:24px 12px;text-align:center"><div>你的会员码</div><div style="font-size:22px;font-weight:700;word-break:break-all;margin:12px 0">${escape(record.code)}</div><div style="font-size:14px;color:#6F7C74">${escape(record.planName)} · 有效期至 ${escape(expiry)}</div></div><div style="line-height:2;margin:24px 0">1. 打开 <b>${escape(new URL(origin).hostname)}</b><br>2. 进入 <b>「我的学习」</b><br>3. 输入上面的会员码，即刻开始</div><a href="${escape(link)}" style="display:block;background:#0F3527;color:white;padding:16px;border-radius:999px;text-align:center;text-decoration:none;font-weight:700">去输入会员码</a><p style="font-size:13px;color:#6F7C74;line-height:1.8;margin-top:24px">这个码最多同时在 ${DEVICE_LIMIT} 台设备上使用，请不要转发给他人。<br>如果输入时遇到问题，在网站「联系我们」里找到我们，会尽快帮你处理。</p><p style="font-size:12px;text-align:center;color:#6F7C74">© Yz English. All rights reserved.</p></div></div>`;
  return { sessionId: record.sessionId, to: record.email, subject: '你的会员码', html, text,
    status: 'pending_configuration', sentAt: null };
}
module.exports = { membershipMail, membershipLink };
