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

function setup({ maxDevices = 2, cookiePrefix } = {}) {
  let currentTime = Date.parse("2026-11-03T18:00:00.000Z");
  const repository = new MemoryMembershipRepository({
    [codeHash]: { type: "year", expiresAt: "2027-12-31T23:59:59.000Z", disabled: false, maxDevices },
  });
  const objectSigner = { async sign(key, ttl) { return `https://signed.example/${key}?ttl=${ttl}`; } };
  const app = createApp({
    repository,
    objectSigner,
    config: { ...config, cookiePrefix },
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

async function browser(app, ip) {
  const response = await app(request('/v1/membership/redeem', { method: 'POST', body: { code }, ip }));
  assert.equal(response.statusCode, 200);
  const cookie = responseCookies(response);
  return async body => {
    const response = await app(request('/v1/learning', { method: body ? 'POST' : 'GET', body, cookie, ip }));
    return { status: response.statusCode, ...JSON.parse(response.body) };
  };
}
const firstDate = '2026-11-01T00:00:00.000Z';
const secondDate = '2026-11-02T00:00:00.000Z';
const mistake = (entryId, source = 'manual', addedAt = firstDate) => ({ entryId, source, sceneId: 'HC-06-001', addedAt });
test('two browsers share progress, learned marks and three mistakes; removal survives refresh and repeated migration', async () => {
  const { app } = setup();
  const a = await browser(app, '127.0.0.1'); const b = await browser(app, '127.0.0.2');
  await a({ type: 'merge', value: { progress: { 'HC-06-001': { percent: 42, updatedAt: secondDate } }, learned: ['word-toothache'], mistakes: [mistake('word-cavity')] } });
  await a({ type: 'addMistake', value: mistake('word-molar') });
  await a({ type: 'addMistake', value: mistake('chunk-bite-down', 'dictation') });
  await b({ type: 'merge', value: { progress: { 'HC-06-001': { percent: 10, updatedAt: firstDate } }, learned: ['word-cavity'], mistakes: [] } });
  const before = await b();
  assert.equal(before.data.progress['HC-06-001'].percent, 42);
  assert.deepEqual(new Set(before.data.learned), new Set(['word-toothache', 'word-cavity']));
  assert.equal(before.data.mistakes.length, 3);
  await b({ type: 'removeMistake', entryId: 'word-cavity' });
  await a({ type: 'merge', value: { progress: {}, learned: [], mistakes: [mistake('word-cavity')] } });
  const after = await a();
  assert.equal(after.data.mistakes.length, 2);
  assert.ok(!after.data.mistakes.some(item => item.entryId === 'word-cavity'));
  await b({ type: 'unlearn', entryId: 'word-cavity' });
  assert.deepEqual((await a()).data.learned, ['word-toothache']);
});
test('duplicate mistakes update date/source without duplication; independent operations retain each other', async () => {
  const { app } = setup(); const a = await browser(app, '127.0.0.1');
  await Promise.all([a({ type: 'addMistake', value: mistake('word-cavity') }), a({ type: 'learn', entryId: 'word-molar' })]);
  await a({ type: 'addMistake', value: mistake('word-cavity', 'dictation', secondDate) });
  const { data } = await a();
  assert.deepEqual(data.learned, ['word-molar']); assert.deepEqual(data.mistakes, [mistake('word-cavity', 'dictation', secondDate)]);
});
test('learning API requires valid membership and allowed origin; rejects arbitrary fields and malformed records', async () => {
  const { app } = setup();
  assert.equal((await app(request('/v1/learning'))).statusCode, 401);
  const denied = request('/v1/learning'); denied.headers.origin = 'https://evil.example';
  assert.equal((await app(denied)).statusCode, 403);
  const a = await browser(app, '127.0.0.1');
  for (const body of [{ type: 'addMistake', value: mistake('unknown') }, { type: 'progress', sceneId: '__proto__', value: { percent: 8, updatedAt: firstDate } }, { type: 'progress', sceneId: 'HC-06-001', value: { percent: 101, updatedAt: firstDate } }, { type: 'reminder' }]) assert.equal((await a(body)).status, 400);
  const response = await a({ type: 'progress', sceneId: 'HC-06-001', value: { percent: 8, updatedAt: firstDate, email: 'discard@example.com', input: 'discard' } });
  assert.deepEqual(response.data.progress['HC-06-001'], { percent: 8, updatedAt: firstDate });
  assert.ok(!JSON.stringify(response).includes(codeHash));
  assert.ok(!JSON.stringify(response).includes(code));
});
test('a different membership has a different learning identity and no access to the first member data', async () => {
  const { app, repository } = setup(); const a = await browser(app, '127.0.0.1');
  await a({ type: 'learn', entryId: 'word-cavity' });
  const other = 'YZ-ANOTHER-TEST-CODE';
  await repository.putCode(keyedHash(config.codePepper, other), { type: 'founder', expiresAt: null });
  const redeemed = await app(request('/v1/membership/redeem', { method: 'POST', body: { code: other }, ip: '127.0.0.3' }));
  const response = await app(request('/v1/learning', { cookie: responseCookies(redeemed) }));
  const result = JSON.parse(response.body);
  assert.deepEqual(result.data, { progress: {}, learned: [], mistakes: [] });
  assert.notEqual(result.learningId, (await a()).learningId);
});

test('staging cookie namespace does not replace production credentials', async () => {
  const { app } = setup({ cookiePrefix: 'yz_member_staging' });
  const response = await app(request('/v1/membership/redeem', { method: 'POST', body: { code } }));
  assert.ok(response.headers['Set-Cookie'].every(value => value.startsWith('yz_member_staging_')));
  const cookie = responseCookies(response);
  const learning = await app(request('/v1/learning', { cookie }));
  assert.equal(learning.statusCode, 200);
  assert.ok(learning.headers['Set-Cookie'][0].startsWith('yz_member_staging_session='));
});
