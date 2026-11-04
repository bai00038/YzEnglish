function splitCsv(value) {
  return String(value ?? "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function required(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadConfig(env = process.env) {
  const repositoryMode = env.MEMBERSHIP_REPOSITORY || "oss";
  const config = {
    allowedOrigins: splitCsv(required(env, "ALLOWED_ORIGINS")),
    cookieDomain: env.COOKIE_DOMAIN || undefined,
    sessionSecret: required(env, "SESSION_SECRET"),
    codePepper: required(env, "CODE_PEPPER"),
    repositoryMode,
    membershipDataPrefix: env.MEMBERSHIP_DATA_PREFIX || "_private/membership",
    signedUrlTtlSeconds: Number(env.OSS_SIGNED_URL_TTL_SECONDS || 600),
  };
  if (config.sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  if (config.codePepper.length < 32) throw new Error("CODE_PEPPER must be at least 32 characters");
  if (config.allowedOrigins.length === 0) throw new Error("ALLOWED_ORIGINS cannot be empty");
  if (repositoryMode === "oss") {
    required(env, "OSS_REGION");
    required(env, "OSS_BUCKET");
    required(env, "MEMBERSHIP_OSS_BUCKET");
  }
  return config;
}

module.exports = { loadConfig };
