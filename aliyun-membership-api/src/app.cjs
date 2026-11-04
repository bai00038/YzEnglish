const { cookie, json, parseCookies, readJsonBody } = require("./http.cjs");
const { keyedHash, normalizeCode, randomId, signSession, verifySession } = require("./security.cjs");

const SESSION_COOKIE = "yz_member_session";
const DEVICE_COOKIE = "yz_member_device";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const ACTIVE_SESSION_SECONDS = 15 * 60;
const DEVICE_SECONDS = 365 * 24 * 60 * 60;
const SCENE_ID_RE = /^(?:[A-Z]{2,4}-\d{2}-\d{3}|[A-Z]{2,4}-\d{3})$/;
const SAFE_OBJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._\- /]{1,500}\.(?:mp4|pdf)$/i;

class RuntimeRateLimiter {
  constructor({ limit = 8, windowMs = 10 * 60 * 1000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.entries = new Map();
  }

  consume(key, now = Date.now()) {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= this.limit;
  }
}

function membershipValid(record, now) {
  if (!record || record.disabled === true || !["founder", "year", "month"].includes(record.type)) return false;
  if (record.type === "founder") return record.expiresAt == null;
  const expiry = Date.parse(record.expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

function membershipSummary(record) {
  return { type: record.type, expiresAt: record.type === "founder" ? null : record.expiresAt };
}

function createApp({ repository, objectSigner, config, now = () => Date.now(), rateLimiter = new RuntimeRateLimiter() }) {
  const allowedOrigins = new Set(config.allowedOrigins ?? []);

  function corsHeaders(origin) {
    if (!origin || !allowedOrigins.has(origin)) return {};
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
  }

  async function authenticate(request) {
    const cookies = parseCookies(request.headers.cookie ?? request.headers.Cookie ?? "");
    const payload = verifySession(config.sessionSecret, cookies[SESSION_COOKIE], now());
    if (!payload?.codeHash || !payload?.deviceHash) return { error: "membership_required" };
    const record = await repository.getCode(payload.codeHash);
    if (!membershipValid(record, now())) return { error: "membership_required" };
    const nowIso = new Date(now()).toISOString();
    const activeAfterIso = new Date(now() - ACTIVE_SESSION_SECONDS * 1000).toISOString();
    const session = await repository.claimSession(
      payload.codeHash,
      payload.deviceHash,
      record.maxDevices ?? 2,
      nowIso,
      activeAfterIso
    );
    if (!session.allowed) return { error: "session_limit_reached" };
    return { payload, record, session };
  }

  function renewedSessionCookie(auth) {
    const membershipExpiry = auth.record.type === "founder" ? Number.POSITIVE_INFINITY : Date.parse(auth.record.expiresAt);
    const sessionExpiryMs = Math.min(now() + SESSION_SECONDS * 1000, membershipExpiry);
    const token = signSession(config.sessionSecret, {
      codeHash: auth.payload.codeHash,
      deviceHash: auth.payload.deviceHash,
      type: auth.record.type,
      exp: Math.floor(sessionExpiryMs / 1000),
    });
    return cookie(SESSION_COOKIE, token, {
      domain: config.cookieDomain,
      maxAge: Math.floor((sessionExpiryMs - now()) / 1000),
    });
  }

  return async function handle(request) {
    const method = String(request.method ?? "GET").toUpperCase();
    const path = String(request.path ?? "/").split("?")[0];
    const origin = request.headers.origin ?? request.headers.Origin ?? "";
    const cors = corsHeaders(origin);

    if (method === "OPTIONS") {
      if (origin && !allowedOrigins.has(origin)) return json(403, { error: "origin_not_allowed" });
      return {
        statusCode: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        },
        body: "",
      };
    }

    if (path === "/health" && method === "GET") return json(200, { ok: true, service: "yz-membership-api" }, cors);
    if (origin && !allowedOrigins.has(origin)) return json(403, { error: "origin_not_allowed" });

    if (path === "/v1/membership/redeem" && method === "POST") {
      const ip = String(request.ip ?? "unknown");
      const attemptKey = keyedHash(config.codePepper, ip);
      if (!rateLimiter.consume(attemptKey, now())) return json(429, { error: "too_many_attempts" }, cors);

      let body;
      try {
        body = readJsonBody(request);
      } catch {
        return json(400, { error: "invalid_request" }, cors);
      }
      const normalized = normalizeCode(body.code);
      if (normalized.length < 8 || normalized.length > 128) return json(401, { error: "invalid_code" }, cors);
      const codeHash = keyedHash(config.codePepper, normalized);
      const record = await repository.getCode(codeHash);
      if (!membershipValid(record, now())) return json(401, { error: "invalid_code" }, cors);

      const requestCookies = parseCookies(request.headers.cookie ?? request.headers.Cookie ?? "");
      const deviceId = requestCookies[DEVICE_COOKIE] || randomId();
      const deviceHash = keyedHash(config.codePepper, deviceId);
      const nowIso = new Date(now()).toISOString();
      const activeAfterIso = new Date(now() - ACTIVE_SESSION_SECONDS * 1000).toISOString();
      const session = await repository.claimSession(codeHash, deviceHash, record.maxDevices ?? 2, nowIso, activeAfterIso);
      if (!session.allowed) return json(409, { error: "session_limit_reached" }, cors);

      const membershipExpiry = record.type === "founder" ? Number.POSITIVE_INFINITY : Date.parse(record.expiresAt);
      const sessionExpiryMs = Math.min(now() + SESSION_SECONDS * 1000, membershipExpiry);
      const token = signSession(config.sessionSecret, {
        codeHash,
        deviceHash,
        type: record.type,
        exp: Math.floor(sessionExpiryMs / 1000),
      });
      const response = json(200, { membership: membershipSummary(record), sessionsUsed: session.count }, cors);
      response.headers["Set-Cookie"] = [
        cookie(SESSION_COOKIE, token, { domain: config.cookieDomain, maxAge: Math.floor((sessionExpiryMs - now()) / 1000) }),
        cookie(DEVICE_COOKIE, deviceId, { domain: config.cookieDomain, maxAge: DEVICE_SECONDS }),
      ];
      return response;
    }

    if (path === "/v1/membership/status" && method === "GET") {
      const auth = await authenticate(request);
      if (auth.error === "session_limit_reached") return json(409, { authenticated: false, error: auth.error }, cors);
      if (auth.error) return json(200, { authenticated: false }, cors);
      const response = json(200, {
        authenticated: true,
        membership: membershipSummary(auth.record),
        activeSessions: auth.session.count,
      }, cors);
      response.headers["Set-Cookie"] = [renewedSessionCookie(auth)];
      return response;
    }

    if (path === "/v1/membership/logout" && method === "POST") {
      const cookies = parseCookies(request.headers.cookie ?? request.headers.Cookie ?? "");
      const payload = verifySession(config.sessionSecret, cookies[SESSION_COOKIE], now());
      if (payload?.codeHash && payload?.deviceHash) {
        await repository.endSession(payload.codeHash, payload.deviceHash);
      }
      const response = json(200, { ok: true }, cors);
      response.headers["Set-Cookie"] = [cookie(SESSION_COOKIE, "", { domain: config.cookieDomain, maxAge: 0 })];
      return response;
    }

    if (path === "/v1/content/sign" && method === "POST") {
      const auth = await authenticate(request);
      if (auth.error) return json(auth.error === "session_limit_reached" ? 409 : 401, { error: auth.error }, cors);
      let body;
      try {
        body = readJsonBody(request);
      } catch {
        return json(400, { error: "invalid_request" }, cors);
      }
      const sceneId = String(body.sceneId ?? "").toUpperCase();
      const objectKey = String(body.objectKey ?? "");
      if (
        !SCENE_ID_RE.test(sceneId) ||
        !SAFE_OBJECT_RE.test(objectKey) ||
        !objectKey.startsWith(`content/${sceneId}/`) ||
        objectKey.includes("..") ||
        objectKey.includes("//")
      ) {
        return json(400, { error: "invalid_object" }, cors);
      }
      const ttl = Math.min(900, Math.max(60, Number(config.signedUrlTtlSeconds) || 600));
      const signedUrl = await objectSigner.sign(objectKey, ttl);
      const response = json(200, { url: signedUrl, expiresAt: new Date(now() + ttl * 1000).toISOString() }, cors);
      response.headers["Set-Cookie"] = [renewedSessionCookie(auth)];
      return response;
    }

    return json(404, { error: "not_found" }, cors);
  };
}

module.exports = { RuntimeRateLimiter, createApp };
