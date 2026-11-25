import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {build} from 'esbuild';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {StaticRouter} from 'react-router';
const code=(await build({entryPoints:['src/app/pages/PurchasePage.tsx'],bundle:true,format:'cjs',platform:'node',write:false,
 alias:{'@':new URL('../../src',import.meta.url).pathname},external:['react','react-router'],loader:{'.css':'empty'},jsx:'automatic',define:{'import.meta.env':'{}'}})).outputFiles[0].text;
const m={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),m,m.exports);
const render=location=>renderToStaticMarkup(React.createElement(StaticRouter,{location},React.createElement(m.exports.PurchasePage)));
test('purchase copy, prices, default two-year choice and shared components are preserved',()=>{
 const html=render('/membership');assert.match(html,/开通会员/);assert.match(html,/¥149/);assert.match(html,/¥249/);assert.match(html,/更划算/);
 const inputs=html.match(/<input[^>]*>/g);assert.ok(inputs.find(x=>x.includes('value="two_year"')).includes('checked=""'));assert.ok(!inputs.find(x=>x.includes('value="year"')).includes('checked=""'));
 for(const text of ['解锁全部真实场景，先排练，再上场。Real scenes for real life.','全部 100+ 集真实场景视频（看病、家长会、购物、安家……持续更新，会员期内新增免费同步解锁）','精听 ＋ 挖空听写 ＋ 锁屏听（逐句练，跟上每一句）','每集配套讲义 PDF（可下载、可打印）','锦囊库全开（表达 · 词伙 · 词汇，全部提炼自场景原句）','付款后，会员码即时发到你的邮箱，在「我的学习」输码即可用。','我们希望你每次续费，都是因为它真的有用。不支持无理由退款，详见'])assert.ok(html.replace(/<[^>]*>/g, "").includes(text),text);
 assert.match(html,/href="\/refund-policy"/);assert.match(html,/href="\/terms"/);assert.doesNotMatch(html,/如遇技术故障或重复扣款，全额退回/);
 assert.ok(html.indexOf('class="payment-trust"') < html.indexOf('选择时长</h2>'));
 assert.match(html, /class="whitespace-nowrap">持续更新<\/span>/);assert.doesNotMatch(html,/带原声/);
 assert.match(html,/site-page-heading/);assert.match(html,/learning-card payment-card/);
});
test('cancelled return gives the exact friendly notice, without marking payment successful',()=>{
 const html=render('/membership?checkout=cancelled');assert.match(html,/付款未完成，没有扣款，可以重新尝试/);assert.doesNotMatch(html,/付款已确认|开通成功/);
});
