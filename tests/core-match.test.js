/**
 * Wildcard matcher.
 *
 * Today the matcher exists twice: module-private in src/core/lib/event_catcher.js (used by `catch(event).get`)
 * and in src/plugins/page/lib/test_dataLayer_object.js. 1.11.0 adds src/core/lib/match.js for new consumers
 * (`jentis`); the existing two switch to it in 1.12.0. This table locks today's semantics and proves the new
 * matcher equal on every valid input.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import page_matcher from "../src/plugins/page/lib/test_dataLayer_object.js"
import { matches } from "../src/core/lib/match.js"

const NODE = Object.freeze({
  "@type": "site/components/content/teaser/link",
  "dc:title": "Book parking",
  "count": 2,
  "flag": true,
  "empty": "",
})

// [description, test, expected (all must match), expected (one_of)]
const CASES = [
  ["empty test → truthy node", {}, true, true],
  ["exact string", { "dc:title": "Book parking" }, true, true],
  ["exact string, other case", { "dc:title": "book parking" }, false, false],
  ["wildcard suffix", { "@type": "*/link" }, true, true],
  ["wildcard prefix", { "@type": "site/*" }, true, true],
  ["wildcard middle", { "@type": "site/*/link" }, true, true],
  ["wildcard only", { "@type": "*" }, true, true],
  ["repeated wildcards", { "@type": "site/**/link" }, true, true],
  ["anchored: no partial match", { "@type": "components" }, false, false],
  ["regex characters are literal", { "dc:title": "Book.parking" }, false, false],
  ["regex characters literal, matching", { "@type": "site/components/content/teaser/lin?" }, false, false],
  ["empty string field, empty pattern", { empty: "" }, true, true],
  ["number: exact", { count: 2 }, true, true],
  ["number: other value", { count: 3 }, false, false],
  ["boolean: exact", { flag: true }, true, true],
  ["missing field", { nope: "x" }, false, false],
  ["two fields, both match", { "@type": "*/link", "count": 2 }, true, true],
  ["two fields, one matches", { "@type": "*/link", "count": 3 }, false, true],
  ["two fields, none match", { "@type": "*/image", "count": 3 }, false, false],
]

for (const [label, t, all, one_of] of CASES) {
  test(`TODAY (page matcher): ${label}`, () => {
    assert.equal(page_matcher(NODE, t), all)
    assert.equal(page_matcher(NODE, t, { one_of: true }), one_of)
  })
  test(`new matches() equals today's matcher: ${label}`, () => {
    assert.equal(matches(NODE, t), all)
    assert.equal(matches(NODE, t, { all: true }), all)
    assert.equal(matches(NODE, t, { all: false }), one_of)
  })
}

test("TODAY (core catch().get) matches like the page matcher, with one_of semantics", async () => {
  globalThis.window = { adobeDataLayer: { getState: () => ({ ...NODE }) } }
  try {
    const { default: event_catcher } = await import("../src/core/lib/event_catcher.js")
    const app = { logger: { info() {}, warning() {}, error() {}, success() {} } }
    const caught = event_catcher(app)({
      $type: "adobe-client-data-layer:event",
      message: { event: "cmp:click", eventInfo: { path: "component.x" } },
    })
    assert.ok(caught.get({ "@type": "*/link", "count": 3 }), "one field matches → node returned (one_of)")
    assert.equal(caught.get({ "@type": "*/image", "count": 3 }), undefined, "none matches → undefined")
  } finally {
    delete globalThis.window
  }
})

// ---------- defined behaviour where today's matchers throw (new matcher only) ----------

test("TODAY: a non-string pattern against a string field throws in the page matcher", () => {
  assert.throws(() => page_matcher(NODE, { "dc:title": 5 }))
})

test("new matches(): a non-string pattern against a string field is false, not a throw", () => {
  assert.equal(matches(NODE, { "dc:title": 5 }), false)
})

test("new matches(): null / undefined / non-object node is false", () => {
  for (const node of [null, undefined, "x", 5]) {
    assert.equal(matches(node, {}), false)
    assert.equal(matches(node, { "@type": "*" }), false)
  }
})

test("new matches(): missing / non-object test means 'no condition'", () => {
  assert.equal(matches(NODE), true)
  assert.equal(matches(NODE, null), true)
})
