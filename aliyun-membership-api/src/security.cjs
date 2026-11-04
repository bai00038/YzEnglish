const crypto = require("node:crypto");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

function keyedHash(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function signSession(secret, payload) {
  const encoded = base64url(JSON.stringify({ v: 1, ...payload }));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifySession(secret, token, now = Date.now()) {
  if (typeof token !== "string" || token.length > 4096) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.v !== 1 || !Number.isFinite(payload.exp) || payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function randomId(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

module.exports = { keyedHash, normalizeCode, randomId, signSession, verifySession };
