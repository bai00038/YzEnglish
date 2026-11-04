const { createApp } = require("./app.cjs");
const { loadConfig } = require("./config.cjs");
const { MemoryMembershipRepository, OssMembershipRepository, createOssClient } = require("./repository.cjs");

function createRuntime(env = process.env) {
  const config = loadConfig(env);
  const contentClient = config.repositoryMode === "oss" ? createOssClient(env, env.OSS_BUCKET) : null;
  const membershipClient = config.repositoryMode === "oss"
    ? createOssClient(env, env.MEMBERSHIP_OSS_BUCKET)
    : null;
  const repository = membershipClient
    ? new OssMembershipRepository(membershipClient, config.membershipDataPrefix)
    : new MemoryMembershipRepository();
  const objectSigner = {
    async sign(objectKey, ttl) {
      if (!contentClient) throw new Error("OSS signing is unavailable in memory mode");
      return contentClient.signatureUrlV4("GET", ttl, {}, objectKey);
    },
  };
  return { app: createApp({ repository, objectSigner, config }), config, repository };
}

module.exports = { createRuntime };
