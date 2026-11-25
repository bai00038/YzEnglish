const plans = require('../config/payment-plans.json');

function loadPaymentConfig(env = process.env) {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)) throw new Error('Stripe test mode is required');
  if (!/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '')) throw new Error('Stripe test webhook secret is required');
  const origin = new URL(env.PAYMENTS_SITE_ORIGIN || 'https://staging.learnyzenglish.com');
  if (origin.origin !== 'https://staging.learnyzenglish.com' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Payments are staging-only');
  const configured = plans.map(plan => {
    const priceId = env[plan.priceEnv];
    if (!/^price_[A-Za-z0-9]+$/.test(priceId || '')) throw new Error(`Missing payment price configuration: ${plan.priceEnv}`);
    const legacyPriceIds = String(env[plan.priceEnv.replace('STRIPE_PRICE_', 'STRIPE_LEGACY_PRICE_')] || '').split(',').map(s => s.trim()).filter(Boolean);
    if (legacyPriceIds.some(id => !/^price_[A-Za-z0-9]+$/.test(id))) throw new Error('Invalid legacy Stripe price');
    return { ...plan, priceId, legacyPriceIds };
  });
  if (new Set(configured.map(p => p.priceId)).size !== configured.length) throw new Error('Payment plans must use distinct Stripe prices');
  return { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    siteOrigin: origin.origin, purchasePath: env.PAYMENTS_PURCHASE_PATH || '/membership',
    prefix: env.PAYMENTS_DATA_PREFIX || '_private/payments-staging', plans: configured };
}
module.exports = { loadPaymentConfig };
