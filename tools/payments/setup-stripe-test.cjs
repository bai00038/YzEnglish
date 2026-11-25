// Run with `node --env-file=.env tools/payments/setup-stripe-test.cjs`.
// Never prints credentials, webhook secrets, checkout URLs or customer records.
const fs = require('node:fs');
const Stripe = require('../../aliyun-membership-api/node_modules/stripe');
const plans = require('../../aliyun-membership-api/config/payment-plans.json');
const secret = process.env.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_test_/.test(secret || '')) throw new Error('A test-mode Stripe key is required');
const stripe = new Stripe(secret, { maxNetworkRetries: 1, timeout: 15000 });
const marker = 'yz-membership-staging-v1';
const endpointUrl = 'https://api-staging.learnyzenglish.com/v1/payments/webhook';
const envPath = '.env';
const save = values => {
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean) : [];
  const keys = new Set(Object.keys(values));
  const lines = current.filter(line => !keys.has(line.split('=')[0]));
  for (const [key, value] of Object.entries(values)) lines.push(`${key}=${value}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', { mode: 0o600 });fs.chmodSync(envPath, 0o600);
};
(async () => {
  const existing = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
  for (const plan of plans) {
    const name = `Yz English 全站场景英语会员 · ${plan.name}（${plan.years} 年）`;
    let price = existing.data.find(p => p.metadata?.integration === marker && p.metadata?.plan === plan.id && p.metadata?.catalog === 'duration-v2' && p.unit_amount === plan.amount && p.currency === plan.currency && !p.recurring);
    if (!price) {
      const product = await stripe.products.create({ name, description: `${plan.name} · 有效期 ${plan.years} 年`, metadata: { integration: marker, plan: plan.id, catalog: 'duration-v2' } }, { idempotencyKey: `${marker}:duration-v2:product:${plan.id}` });
      if (product.livemode !== false) throw new Error('Refusing a live product');
      price = await stripe.prices.create({ product: product.id, currency: plan.currency, unit_amount: plan.amount, nickname: `${plan.name} · ${plan.years} 年`,
        metadata: { integration: marker, plan: plan.id, catalog: 'duration-v2' } }, { idempotencyKey: `${marker}:duration-v2:price:${plan.id}:${plan.currency}:${plan.amount}` });
    }
    if (price.livemode !== false) throw new Error('Refusing a live price');
    const legacyEnv = plan.priceEnv.replace('STRIPE_PRICE_', 'STRIPE_LEGACY_PRICE_');
    const legacy = new Set(String(process.env[legacyEnv] || '').split(',').filter(Boolean));
    if (process.env[plan.priceEnv] && process.env[plan.priceEnv] !== price.id) legacy.add(process.env[plan.priceEnv]);
    save({ [plan.priceEnv]: price.id, [legacyEnv]: [...legacy].join(',') });console.log(`Configured test price: ${plan.name}, ${plan.years} years, ${plan.currency.toUpperCase()} ${plan.amount / 100}`);
  }
  const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const previous = existingEndpoints.data.find(e => e.url === endpointUrl && e.status === 'enabled');
  if (previous) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Existing endpoint needs its signing secret in environment; it cannot be retrieved again');
    console.log('Existing test webhook retained.');
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url: endpointUrl, enabled_events: ['checkout.session.completed'], description: 'YZ English staging payment step 1', metadata: { integration: marker } }, { idempotencyKey: `${marker}:webhook-v1` });
    if (endpoint.livemode !== false || !endpoint.secret) throw new Error('Test webhook setup failed');
    save({ STRIPE_WEBHOOK_SECRET: endpoint.secret });console.log('Test webhook configured; signing secret saved privately.');
  }
  save({ PAYMENTS_SITE_ORIGIN: 'https://staging.learnyzenglish.com', PAYMENTS_PURCHASE_PATH: '/membership', PAYMENTS_DATA_PREFIX: '_private/payments-staging' });
})().catch(error => { console.error(JSON.stringify({ operation: 'stripe-test-setup', type: error.type || error.name, code: error.code || 'setup_failed', status: error.statusCode || null }));process.exitCode = 1; });
