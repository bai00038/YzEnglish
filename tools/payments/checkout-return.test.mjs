import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {build} from 'esbuild';
const code=(await build({entryPoints:['src/data/payments/checkout-return.ts'],bundle:true,platform:'node',format:'cjs',write:false})).outputFiles[0].text;
const m={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),m,m.exports);
const {subscribeCheckoutReturn}=m.exports;
function pageshow(persisted){const e=new Event('pageshow');Object.defineProperty(e,'persisted',{value:persisted});return e;}
test('bfcache return and return during in-flight Checkout reset controls; initial load does not',()=>{
 const target=new EventTarget();let inFlight=false,resets=0;
 const unsubscribe=subscribeCheckoutReturn(target,()=>inFlight,()=>{inFlight=false;resets++;});
 target.dispatchEvent(pageshow(false));assert.equal(resets,0);
 inFlight=true;target.dispatchEvent(pageshow(false));assert.equal(resets,1);assert.equal(inFlight,false);
 target.dispatchEvent(pageshow(true));assert.equal(resets,2);
 unsubscribe();target.dispatchEvent(pageshow(true));assert.equal(resets,2);
});
