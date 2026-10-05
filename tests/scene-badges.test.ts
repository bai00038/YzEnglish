import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isSceneNew } from "../src/data/scene-badges.ts";

const publishedAt = "2026-10-04T12:00:00-04:00";
const publishedTime = Date.parse(publishedAt);
const week = 7 * 24 * 60 * 60 * 1000;

test("NEW displays only during the first seven days", () => {
  assert.equal(isSceneNew(publishedAt, publishedTime - 1), false);
  assert.equal(isSceneNew(publishedAt, publishedTime), true);
  assert.equal(isSceneNew(publishedAt, publishedTime + week - 1), true);
  assert.equal(isSceneNew(publishedAt, publishedTime + week), false);
});

test("missing and invalid publication dates do not show NEW", () => {
  assert.equal(isSceneNew(undefined, publishedTime), false);
  assert.equal(isSceneNew("not-a-date", publishedTime), false);
});
