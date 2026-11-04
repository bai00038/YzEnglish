import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isSceneNew } from "../src/data/scene-badges.ts";

const publishedAt = "2026-11-03T23:58:00-05:00";
const publishedTime = Date.parse(publishedAt);

test("NEW displays only on the Toronto publication date", () => {
  assert.equal(isSceneNew(publishedAt, publishedTime - 1), false);
  assert.equal(isSceneNew(publishedAt, publishedTime), true);
  assert.equal(isSceneNew(publishedAt, Date.parse("2026-11-03T23:59:59-05:00")), true);
  assert.equal(isSceneNew(publishedAt, Date.parse("2026-11-04T00:00:00-05:00")), false);
});

test("missing and invalid publication dates do not show NEW", () => {
  assert.equal(isSceneNew(undefined, publishedTime), false);
  assert.equal(isSceneNew("not-a-date", publishedTime), false);
});
