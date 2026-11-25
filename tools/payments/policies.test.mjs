import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import fs from 'node:fs';
import {build} from 'esbuild';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {StaticRouter} from 'react-router';
const outputs=(await build({entryPoints:['src/app/pages/PaymentPolicyPage.tsx','src/data/payments/policies.ts'],outdir:'unused',bundle:true,format:'cjs',platform:'node',write:false,
 alias:{'@':new URL('../../src',import.meta.url).pathname},external:['react','react-router'],loader:{'.css':'empty'},jsx:'automatic'})).outputFiles;
const load=name=>{const m={exports:{}};new Function('require','module','exports',outputs.find(o=>o.path.endsWith(`/${name}.js`)).text)(createRequire(import.meta.url),m,m.exports);return m.exports;};
const {PaymentPolicyPage}=load('PaymentPolicyPage'),{refundPolicy,serviceTerms}=load('policies');
test('refund and service terms preserve every supplied sentence from the updated copy',()=>{
 const markdown=fs.readFileSync(new URL('./fixtures/policy-copy-20261123.md',import.meta.url),'utf8').replaceAll('**','');
 for(const policy of [refundPolicy,serviceTerms]){
  if(policy.introduction)assert.ok(markdown.includes(policy.introduction));
  for(const item of policy.items)assert.ok(markdown.includes(item.title+'：'+item.body),item.title);
 }
 assert.equal(refundPolicy.items.length,4);assert.equal(serviceTerms.items.length,6);
});
test('both legal pages have reusable headings, complete policy content, contact and purchase links',()=>{
 for(const [kind,policy] of [['refund',refundPolicy],['terms',serviceTerms]]){
  const html=renderToStaticMarkup(React.createElement(StaticRouter,null,React.createElement(PaymentPolicyPage,{kind})));
  assert.ok(html.includes(policy.title));for(const item of policy.items)assert.ok(html.includes(item.title));
  assert.match(html,/href="\/membership"/);assert.match(html,/href="\/contact"/);assert.match(html,/site-page-heading/);
 }
});
