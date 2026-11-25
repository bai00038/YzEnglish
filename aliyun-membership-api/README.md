# Yz English 阿里云会员安全后端

This service is designed for Alibaba Cloud Function Compute. It keeps membership-code validation and OSS signing out of the browser.

## Endpoints

- `GET /health`
- `POST /v1/membership/redeem` with `{ "code": "..." }`
- `GET /v1/membership/status`
- `POST /v1/membership/logout`
- `POST /v1/content/sign` with `{ "sceneId": "FD-01-001", "objectKey": "content/FD-01-001/FD-01-001-no-subtitles.mp4" }`

Successful redemption sets an HttpOnly session cookie. At most three browser sessions are active at once by default (shared limit: `config/membership.json`). An inactive slot is released after 15 minutes, while the signed browser credential rolls forward for 30 days whenever the member returns. The browser never receives the membership-code hash list or an OSS credential.

## Safety boundary

- `MEMBERSHIP_REPOSITORY=memory` is for local tests only.
- Production fails closed unless both OSS buckets and RAM credentials are configured.
- Signed objects must stay below `content/<SCENE_ID>/` and use an allowed extension.
- Membership codes and device records live in a separate private bucket (`MEMBERSHIP_OSS_BUCKET`). They must never share the public content bucket.
- The OSS bucket remains public until staging is fully verified. Make it private only during the final cutover.

## Local test

```bash
cp .env.example .env.local
npm test
npm start
```

The local server does not load `.env.local` automatically. Export the variables in your shell or use the Function Compute configuration panel.

## Production records

Membership records live in the separate private `yz-english-membership` bucket under:

- `_private/membership/codes/<code-hash>.json`
- `_private/membership/devices/<code-hash>/<device-hash>.json`

The provisioning script uploads only keyed hashes. Plaintext codes must be delivered to the buyer and never stored in the frontend repository. The publishing manifest never references `_private/` objects.

## Member learning data (§十五)

- `GET /v1/learning` returns `{learningId, data: {progress, learned, mistakes}, migrated}`.
- `POST /v1/learning` accepts one validated operation: `progress`, `learn`, `unlearn`, `addMistake`, `removeMistake`, or the first-device `merge`.
- Both endpoints use the existing cookie session, validity check and exact origin allowlist. No code/hash or identity parameter is accepted from the caller. `learningId` is an opaque keyed cache namespace, not an authentication credential.
- Progress stores only `{percent, updatedAt}` per scene. Learned marks are entry IDs. Mistakes store `{entryId, source, sceneId, addedAt}`; repeated IDs update the timestamp instead of adding a row.
- The private bucket stores the three data categories as a change log at `_private/membership/learning/<code-hash>.jsonl`. `AppendObject` byte positions serialize concurrent device changes; conflicts re-read and retry. Device migration metadata prevents a retry from resurrecting a removed entry. No raw code, answer text, registration data or personal information is stored.
- The first merge chooses newer progress timestamps and unions learned/mistake IDs. Normal writes are single-item operations, so refresh never unions stale caches back over cloud removals.
- Browser caches and pending offline changes are scoped to `learningId`; legacy anonymous records and detailed lesson resume data stay local. Reconnect, returning to the tab, and bounded retries resume synchronization.
- Runtime RAM policy needs `oss:GetObject` and `oss:PutObject` on the new private learning prefix (`AppendObject` uses `oss:PutObject`). Keep that bucket private.

Run `npm run learning:test` from the frontend root for client/server synchronization tests.

### Staging isolation

Before uploading, check actual domain bindings. On 2026-11-20 both `learnyzenglish.com` and `staging.learnyzenglish.com` were bound to **the same** `yz-english-site` bucket. Deploying to that bucket would change production. The intended isolated bucket is `yz-english-site-staging`; move only the staging domain binding/DNS and mirror the website hosting configuration there. Never sync to `yz-english-site` during staging acceptance.

Use a separate staging Function Compute function and `api-staging.learnyzenglish.com`. Preserve existing membership validation and code hashing; staging uses the existing membership code records and private learning store; use a dedicated test code for acceptance. Use host-only staging API cookies (`COOKIE_DOMAIN` unset, `MEMBERSHIP_COOKIE_PREFIX=yz_member_staging`) to avoid replacing production sessions. Do not update the production function or its route before acceptance.


## 当前部署与接管（2026-11-25）

- 源码位于本目录，包含会员验证、设备会话、学习数据、Stripe 测试结账、webhook、发码和邮件模板/发件适配模块；依赖由 `package-lock.json` 固定。
- 会员函数通过阿里云 Function Compute 控制台上传源码 ZIP 部署，不是 Git push 自动部署。当前 staging 函数为 `yz-english-membership-api-staging`，API 为 `https://api-staging.learnyzenglish.com`。
- 现有自定义运行时启动命令为 `npm run start`，端口为 `9000`，对应 `src/local-server.cjs`；`src/index.cjs` 另保留事件 handler，不能把两种入口混用。
- 重建上传包：在本目录执行 `npm ci --omit=dev`，将 `src/`、`config/`、`node_modules/`、`package.json`、`package-lock.json` 放在 ZIP 根目录，上传至 staging 函数后部署。不要包含任何 `.env`、私有配置导出、缓存或测试订单。
- 实际密钥和环境变量保留在函数控制台/本地忽略文件中，仓库仅提供 `.env.example` 和 `.env.payments.example`。RAM 策略 JSON 是权限配置参考，不会随 Git push 自动生效。
- 支付目前仅用 Stripe 测试模式。发码邮件已接阿里云邮件推送（DirectMail，`src/payment-mail-send.cjs`）：在函数环境变量中配齐 `DIRECTMAIL_ACCOUNT_NAME`、`DIRECTMAIL_ACCESS_KEY_ID`、`DIRECTMAIL_ACCESS_KEY_SECRET` 后自动启用（变量清单见 `.env.payments.example`）；未配齐时不发送，邮件留存于私有 outbox，状态接口返回 `pending_configuration`，配齐后由后续履约自动补发。发送成功另存只增状态记录 `outbox-status`，状态接口据此返回 `emailStatus: "sent"`。发送失败不回滚已分配的会员码，也不会谎报已发送。
- 前端执行 `npm run deploy:staging`，固定部署到 `yz-english-site-staging`；网站为 `https://staging.learnyzenglish.com`。此命令不会部署会员函数，也不会操作正式网站桶。
