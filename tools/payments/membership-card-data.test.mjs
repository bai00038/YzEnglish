import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {build} from 'esbuild';
const output=(await build({entryPoints:['src/data/membership.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['react'],
 define:{'import.meta.env.VITE_MEMBERSHIP_API_URL':'"https://api-staging.learnyzenglish.com"'},
 plugins:[{name:'isolated-learning',setup(b){b.onLoad({filter:/\/member-learning\.ts$/},()=>({contents:'export const activateMemberLearning=async()=>{};export const deactivateMemberLearning=()=>{};',loader:'js'}));}}]})).outputFiles[0].text;
function load(){const m={exports:{}};new Function('require','module','exports',output)(createRequire(import.meta.url),m,m.exports);return m.exports;}
const original={window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
test.after(()=>{Object.assign(globalThis,original);});
function fixture(record,response){
 const values=new Map(record?[['yz_membership_unlock',JSON.stringify(record)]]:[]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.localStorage=storage;globalThis.window={localStorage:storage,dispatchEvent(){}};
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>response});
 return values;
}
test('status refresh preserves an expired display card but clears a revoked active membership',async()=>{
 const expired={type:'year',expiresAt:'2020-01-01T00:00:00Z',unlockedAt:'2019-01-01',planName:'年卡'};
 let values=fixture(expired,{authenticated:false});await load().refreshMembershipAccess(true);assert.ok(values.has('yz_membership_unlock'));
 values=fixture({...expired,expiresAt:'2040-01-01T00:00:00Z'},{authenticated:false});await load().refreshMembershipAccess(true);assert.ok(!values.has('yz_membership_unlock'));
});
test('real plan/device fields survive refresh; explicit logout clears the cached card',async()=>{
 const values=fixture(null,{authenticated:true,membership:{type:'year',expiresAt:'2040-01-01T00:00:00Z',planName:'双年卡'},activeSessions:2});
 const membership=load();await membership.refreshMembershipAccess(true);
 const saved=JSON.parse(values.get('yz_membership_unlock'));assert.equal(saved.planName,'双年卡');assert.equal(saved.activeSessions,2);
 await membership.logoutMembershipDevice();assert.ok(!values.has('yz_membership_unlock'));
});
