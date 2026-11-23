import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const script=fs.readFileSync('index.html','utf8').match(/<script>\s*(\/\/ Local development[\s\S]*?)<\/script>/)[1];
function result(href){const url=new URL(href);let next=null;vm.runInNewContext(script,{location:{protocol:url.protocol,hostname:url.hostname,href,replace:v=>{next=v;}}});return next;}
test('public HTTP entry redirects to HTTPS and preserves route, query and hash',()=>{assert.equal(result('http://staging.learnyzenglish.com/scenes/test?resume=1#from'),'https://staging.learnyzenglish.com/scenes/test?resume=1#from');assert.equal(result('http://learnyzenglish.com/'),'https://learnyzenglish.com/');});
test('HTTPS, local preview and unrelated hosts are not redirected',()=>{for(const url of ['https://staging.learnyzenglish.com/','http://localhost:5173/','http://127.0.0.1:5192/','http://learnyzenglish.com.example/'])assert.equal(result(url),null);});
