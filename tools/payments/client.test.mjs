import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const code=(await build({entryPoints:['src/data/payments/client.ts'],bundle:true,format:'cjs',platform:'node',write:false,define:{'import.meta.env':'{"VITE_PAYMENTS_API_URL":"https://api-staging.learnyzenglish.com"}'}})).outputFiles[0].text;
function setup(t,handler){
 const oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage;const store=new Map();
 globalThis.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 globalThis.fetch=handler;t.after(()=>{globalThis.fetch=oldFetch;globalThis.sessionStorage=oldStorage;});
 const m={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),m,m.exports);return{...m.exports,store};
}
test('checkout sends only chosen plan and stable retry identifiers, never a client price',async t=>{
 const sent=[];const c=setup(t,async(url,options)=>{sent.push({url,options});return{ok:true,json:async()=>({sessionId:'cs_test_fixture123',url:'https://checkout.stripe.com/c/pay/fixture'})};});
 await c.startCheckout('two_year');await c.startCheckout('two_year');
 const first=JSON.parse(sent[0].options.body),second=JSON.parse(sent[1].options.body);
 assert.deepEqual(first,second);assert.deepEqual(Object.keys(first).sort(),['planId','receiptToken','requestId']);assert.equal(first.receiptToken.length,43);
 assert.equal(c.store.get('yz-payment-receipt-v1:cs_test_fixture123'),first.receiptToken);
});
test('changing plan creates a new retry key, and an untrusted redirect is rejected',async t=>{
 const requests=[];let trusted=true;const c=setup(t,async(url,options)=>{requests.push(JSON.parse(options.body));return{ok:true,json:async()=>({sessionId:'cs_test_fixture123',url:trusted?'https://checkout.stripe.com/c/pay/a':'https://other.invalid/a'})};});
 await c.startCheckout('year');await c.startCheckout('two_year');assert.notEqual(requests[0].requestId,requests[1].requestId);
 trusted=false;await assert.rejects(()=>c.startCheckout('two_year'));
});
test('status uses a receipt header, never trusts return query parameters, and paid clears checkout draft',async t=>{
 let observed;const c=setup(t,async(url,options)=>{observed={url,options};return{ok:true,json:async()=>({status:'paid'})};});
 await assert.rejects(()=>c.readPaymentStatus('cs_test_missing'));
 c.store.set('yz-payment-receipt-v1:cs_test_example','receipt-fixture');c.store.set('yz-payment-draft-v1','{}');
 assert.equal(await c.readPaymentStatus('cs_test_example'),'paid');assert.equal(observed.options.headers.Authorization,'Bearer receipt-fixture');
 assert.ok(!observed.url.includes('receipt-fixture'));assert.equal(c.store.has('yz-payment-draft-v1'),false);
});
test('browser storage failure happens before any checkout request',async t=>{
 let count=0;const c=setup(t,async()=>{count++;throw Error('must not run');});
 globalThis.sessionStorage.setItem=()=>{throw Error('storage blocked');};await assert.rejects(()=>c.startCheckout('year'));assert.equal(count,0);
});
