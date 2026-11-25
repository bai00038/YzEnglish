const { createApp } = require("./app.cjs");
const { loadConfig } = require("./config.cjs");
const { loadPaymentConfig } = require('./payments-config.cjs');
const { createPaymentApp } = require('./payments.cjs');
const { MemoryPaymentRepository, OssPaymentRepository } = require('./payments-repository.cjs');
const { json } = require('./http.cjs');
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
  const membershipApp = createApp({ repository, objectSigner, config });
  const paymentConfig = loadPaymentConfig(env);
  const paymentRepository = paymentConfig && (membershipClient
    ? new OssPaymentRepository(membershipClient, paymentConfig.prefix)
    : new MemoryPaymentRepository());
  if (paymentRepository) {
    const getExistingCode = repository.getCode.bind(repository);
    // New paid codes use the same redeem/session/learning API and device rules.
    // Their private staging ledger stays inside the approved payments prefix.
    repository.getCode = async hash => await paymentRepository.getIssuedCode(hash) || getExistingCode(hash);
  }
  const paymentApp = paymentConfig && createPaymentApp({
    stripe: new (require('stripe'))(paymentConfig.secretKey, { maxNetworkRetries: 2, timeout: 15000 }),
    repository: paymentRepository, config: paymentConfig, codePepper: config.codePepper,
  });
  const app = request => String(request.path || '').split('?')[0].startsWith('/v1/payments/')
    ? (paymentApp ? paymentApp(request) : json(503, { error: 'payments_unavailable' }))
    : membershipApp(request);
  return { app, config, repository, paymentRepository };

}

module.exports = { createRuntime };
