import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {build} from 'esbuild';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {StaticRouter} from 'react-router';
const code=(await build({entryPoints:['src/app/components/PaymentSuccessCard.tsx','src/data/payments/membership-link.ts'],bundle:true,format:'cjs',platform:'node',write:false,outdir:'unused',
 alias:{'@':new URL('../../src',import.meta.url).pathname},external:['react','react-router'],loader:{'.css':'empty'},jsx:'automatic'})).outputFiles;
const load=i=>{const m={exports:{}};new Function('require','module','exports',code[i].text)(createRequire(import.meta.url),m,m.exports);return m.exports;};
const {PaymentSuccessCard}=load(0),{membershipCodeLink,readMembershipCodeFragment}=load(1);
const receipt={status:'paid',emailStatus:'pending_configuration',membership:{code:'YZ-Y-TEST123456789',expiresAt:'2027-11-23T12:00:00Z',planName:'年卡',renewed:false}};
test('successful receipt shows the code, expiry, whole-card copy target and truthful mail status',()=>{
 const html=renderToStaticMarkup(React.createElement(StaticRouter,null,React.createElement(PaymentSuccessCard,{receipt})));
 for(const text of [receipt.membership.code,'年卡','2027年11月23日','复制会员码','去输入会员码，开始学习','暂未启用邮件发送'])assert.ok(html.includes(text),text);
 assert.match(html,/role="button" tabindex="0" aria-label="复制会员码"/);assert.doesNotMatch(html,/已同步发送/);
 assert.ok(html.includes('/my-learning#membership-code=YZ-Y-TEST123456789'));
});
test('code deep links use fragments and reject malformed or unrelated fragments',()=>{
 assert.equal(readMembershipCodeFragment(membershipCodeLink(receipt.membership.code).split('#')[1]),receipt.membership.code);
 assert.equal(readMembershipCodeFragment('#membership-code=<script>'),'');assert.equal(readMembershipCodeFragment('#other=value'),'');
});
