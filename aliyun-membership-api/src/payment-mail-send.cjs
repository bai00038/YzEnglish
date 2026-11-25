const crypto = require('node:crypto');

// Aliyun DirectMail (邮件推送) transport for membership-code mail.
// Configuration is env-only and fail-closed: when any required variable is
// missing the loader returns null and callers keep the outbox record in its
// initial "pending_configuration" state instead of pretending to send.
function loadMailConfig(env = process.env) {
  const accountName = String(env.DIRECTMAIL_ACCOUNT_NAME || '').trim();
  const accessKeyId = String(env.DIRECTMAIL_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = String(env.DIRECTMAIL_ACCESS_KEY_SECRET || '').trim();
  if (!accountName || !accessKeyId || !accessKeySecret) return null;
  return {
    accountName,
    accessKeyId,
    accessKeySecret,
    fromAlias: String(env.DIRECTMAIL_FROM_ALIAS || 'Yz English').trim() || 'Yz English',
    endpoint: String(env.DIRECTMAIL_ENDPOINT || 'https://dm.ap-southeast-1.aliyuncs.com/').trim(),
    regionId: String(env.DIRECTMAIL_REGION_ID || 'ap-southeast-1').trim(),
  };
}

// Aliyun RPC percent-encoding (RFC 3986 strict): only A-Z a-z 0-9 - _ . ~
// stay literal. encodeURIComponent additionally leaves ! ' ( ) unescaped,
// which the RPC signature spec requires encoded — leaving them literal
// breaks every signature whenever a value contains one (the mail HTML
// body carries apostrophes in its font-family list).
function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function buildSignedRequest(mail, config, { now = new Date(), nonce = crypto.randomUUID() } = {}) {
  const params = {
    AccessKeyId: config.accessKeyId,
    AccountName: config.accountName,
    Action: 'SingleSendMail',
    AddressType: '1',
    Format: 'JSON',
    FromAlias: config.fromAlias,
    HtmlBody: mail.html,
    RegionId: config.regionId,
    ReplyToAddress: 'false',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: nonce,
    SignatureVersion: '1.0',
    Subject: mail.subject,
    TextBody: mail.text,
    Timestamp: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ToAddress: mail.to,
    Version: '2015-11-23',
  };
  const canonical = Object.keys(params).sort()
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`).join('&');
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonical)}`;
  params.Signature = crypto.createHmac('sha1', `${config.accessKeySecret}&`).update(stringToSign).digest('base64');
  const body = Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`).join('&');
  return { url: config.endpoint, body };
}

async function sendMail(mail, config, fetchImpl = fetch) {
  const { url, body } = buildSignedRequest(mail, config);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.Code) throw new Error(`directmail_send_failed:${data.Code || response.status}`);
  return data;
}

module.exports = { loadMailConfig, buildSignedRequest, sendMail };
