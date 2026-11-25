import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {legacyLearningLocation,PURCHASE_PATH,LEARNING_PATH} from '../../src/data/site-routes.ts';
import {getSceneNavigation} from '../../src/data/scene-navigation.ts';
test('purchase and learning have distinct routes; legacy learning subpages keep query and hash',()=>{
 assert.equal(PURCHASE_PATH,'/membership');assert.equal(LEARNING_PATH,'/my-learning');
 assert.equal(legacyLearningLocation('/membership/messages/detail','?id=example','#body'),'/my-learning/messages/detail?id=example#body');
 assert.equal(legacyLearningLocation('/membership'),'/membership');
 assert.equal(getSceneNavigation('?from=membership').returnTo,'/my-learning');
 const app=readFileSync('src/app/App.tsx','utf8');assert.match(app,/path="\/membership" element={<PurchasePage/);assert.match(app,/path="\/my-learning" element={<MembershipPage/);
});
