#!/usr/bin/env node
const { keyedHash, normalizeCode, randomId } = require("../src/security.cjs");
const { OssMembershipRepository, createOssClient } = require("../src/repository.cjs");

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const pepper = process.env.CODE_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("CODE_PEPPER must be set and at least 32 characters");
  const type = arg("type", "month");
  if (!["founder", "year", "month"].includes(type)) throw new Error("--type must be founder, year, or month");
  const plainCode = normalizeCode(arg("code", `YZ-${randomId(12).toUpperCase()}`));
  const expiresAt = type === "founder" ? null : arg("expires", "");
  if (type !== "founder" && !Number.isFinite(Date.parse(expiresAt))) throw new Error("--expires must be an ISO date");
  const maxDevices = Number(arg("max-devices", "2"));
  if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 10) throw new Error("--max-devices must be 1-10");
  if (!process.env.MEMBERSHIP_OSS_BUCKET) throw new Error("MEMBERSHIP_OSS_BUCKET must be set");
  const client = createOssClient(process.env, process.env.MEMBERSHIP_OSS_BUCKET);
  const repository = new OssMembershipRepository(client, process.env.MEMBERSHIP_DATA_PREFIX);
  const codeHash = keyedHash(pepper, plainCode);
  if (await repository.getCode(codeHash)) throw new Error("This membership code already exists");
  await repository.putCode(codeHash, {
    type,
    expiresAt,
    disabled: false,
    maxDevices,
    createdAt: new Date().toISOString(),
  });
  console.log("会员码已创建。明文只显示这一次：");
  console.log(plainCode);
}

main().catch(error => {
  console.error(`错误：${error.message}`);
  process.exitCode = 1;
});
