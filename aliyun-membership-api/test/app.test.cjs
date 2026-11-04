const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp, RuntimeRateLimiter } = require("../src/app.cjs");
const { MemoryMembershipRepository } = require("../src/repository.cjs");
const { keyedHash } = require("../src/security.cjs");

const config = {
  allowedOrigins: ["https://staging.learnyzenglish.com"],
  cookieDomain: ".learnyzenglish.com",
  sessionSecret: "s".repeat(48),
  codePepper: "p".repeat(48),
  signedUrlTtlSeconds: 600,
};
const code = "YZ-TEST-2026-STRONG";
const codeHash = keyedHash(config.codePepper, code);

function setup({ maxDevices = 2 } = {}) {
  let currentTime = Date.parse("2026-11-03T18:00:00.000Z");
  const repository = new MemoryMembershipRepository({
    [codeHash]: { type: "year", expiresAt: "2027-12-31T23:59:59.000Z", disabled: false, maxDevices },
  });
  const objectSigner = { async sign(key, ttl) { return `https://signed.example/${key}?ttl=${ttl}`; } };
  const app = createApp({
    repository,
    objectSigner,
    config,
    now: () => currentTime,
    rateLimiter: new RuntimeRateLimiter({ limit: 8 }),
  });
  return {
    app,
    repository,
    advance(milliseconds) { currentTime += milliseconds; },
  };
}

function request(path, { method = "GET", body, cookie = "", ip = "127.0.0.1" } = {}) {
  return {
    method,
    path,
    body: body ? JSON.stringify(body) : undefined,
    ip,
    headers: { origin: "https://staging.learnyzenglish.com", cookie },
  };
}

function responseCookies(response) {
  return response.headers["Set-Cookie"].map(value => value.split(";", 1)[0]).join("; ");
}

test("rejects an invalid membership code", async () => {
  const { app } = setup();
  const response = await app(request("/v1/membership/redeem", { method: "POST", body: { code: "wrong-code" } }));
  assert.equal(response.statusCode, 401);
});

test("redeems a valid code and returns an authenticated status", async () => {
  const { app } = setup();
  const redeemed = await app(request("/v1/membership/redeem", { method: "POST", body: { code } }));
  assert.equal(redeemed.statusCode, 200);
  assert.equal(JSON.parse(redeemed.body).membership.type, "year");
  const status = await app(request("/v1/membership/status", { cookie: responseCookies(redeemed) }));
  assert.deepEqual(JSON.parse(status.body), {
    authenticated: true,
    membership: { type: "year", expiresAt: "2027-12-31T23:59:59.000Z" },
    activeSessions: 1,
  });
});

test("signs only an authenticated scene object under its own prefix", async () => {
  const { app } = setup();
  const redeemed = await app(request("/v1/membership/redeem", { method: "POST", body: { code } }));
  const cookie = responseCookies(redeemed);
  const signed = await app(request("/v1/content/sign", {
    method: "POST",
    cookie,
    body: { sceneId: "FD-01-001", objectKey: "content/FD-01-001/FD-01-001-no-subtitles.mp4" },
  }));
  assert.equal(signed.statusCode, 200);
  assert.match(JSON.parse(signed.body).url, /^https:\/\/signed\.example\//);

  const legacyScene = await app(request("/v1/content/sign", {
    method: "POST",
    cookie,
    body: { sceneId: "NCP-001", objectKey: "content/NCP-001/NCP-001.pdf" },
  }));
  assert.equal(legacyScene.statusCode, 200);

  const traversal = await app(request("/v1/content/sign", {
    method: "POST",
    cookie,
    body: { sceneId: "FD-01-001", objectKey: "content/FD-01-001/../secret.pdf" },
  }));
  assert.equal(traversal.statusCode, 400);
});

test("enforces the active session limit", async () => {
  const { app } = setup({ maxDevices: 1 });
  const first = await app(request("/v1/membership/redeem", { method: "POST", body: { code } }));
  assert.equal(first.statusCode, 200);
  const second = await app(request("/v1/membership/redeem", { method: "POST", body: { code }, ip: "127.0.0.2" }));
  assert.equal(second.statusCode, 409);
  assert.equal(JSON.parse(second.body).error, "session_limit_reached");
});

test("releases an inactive slot and automatically reacquires it with the signed cookie", async () => {
  const { app, advance } = setup({ maxDevices: 1 });
  const first = await app(request("/v1/membership/redeem", { method: "POST", body: { code } }));
  const firstCookie = responseCookies(first);
  advance(16 * 60 * 1000);

  const second = await app(request("/v1/membership/redeem", {
    method: "POST",
    body: { code },
    ip: "127.0.0.2",
  }));
  assert.equal(second.statusCode, 200);

  const blockedReturn = await app(request("/v1/membership/status", { cookie: firstCookie }));
  assert.equal(blockedReturn.statusCode, 409);
  assert.equal(JSON.parse(blockedReturn.body).error, "session_limit_reached");

  advance(16 * 60 * 1000);
  const automaticReturn = await app(request("/v1/membership/status", { cookie: firstCookie }));
  assert.equal(automaticReturn.statusCode, 200);
  assert.equal(JSON.parse(automaticReturn.body).authenticated, true);
});

test("logout immediately releases the current session", async () => {
  const { app } = setup({ maxDevices: 1 });
  const first = await app(request("/v1/membership/redeem", { method: "POST", body: { code } }));
  const loggedOut = await app(request("/v1/membership/logout", {
    method: "POST",
    cookie: responseCookies(first),
  }));
  assert.equal(loggedOut.statusCode, 200);

  const second = await app(request("/v1/membership/redeem", {
    method: "POST",
    body: { code },
    ip: "127.0.0.2",
  }));
  assert.equal(second.statusCode, 200);
});
