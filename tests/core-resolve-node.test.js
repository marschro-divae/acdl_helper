/**
 * Node resolution.
 *
 * Today: `catch(event).get()` (src/core/lib/event_catcher.js, duplicated in page/lib/get_component_data.js)
 * — Launch-wrapped events only. 1.11.0 adds src/core/lib/resolve_node.js for new consumers (`jentis`): same
 * resolution rules, raw ACDL events too, an explicit state source (for `this.getState` / reconstructed state).
 */
import { test, afterEach } from "node:test"
import assert from "node:assert/strict"
import event_catcher from "../src/core/lib/event_catcher.js"
import { resolve_node } from "../src/core/lib/resolve_node.js"

const STATE = {
  "component.teaser-1": { "@type": "site/teaser", "dc:title": "Teaser", "parentId": "container-9" },
  "component.link-2": { "@type": "site/teaser/link", "dc:title": "Book" },
}
const get_state = (path) => (STATE[path] ? { ...STATE[path] } : undefined)
const quiet = { info() {}, warning() {}, error() {}, success() {} }

afterEach(() => {
  delete globalThis.window
})

function today(message) {
  globalThis.window = { adobeDataLayer: { getState: get_state } }
  return event_catcher({ logger: quiet })({ $type: "adobe-client-data-layer:event", message }).get()
}

// ---------- characterization of catch().get() ----------

test("TODAY: eventInfo.path resolves the node and adds dlh:ownPath / ownId / parentComponent", () => {
  assert.deepEqual(today({ event: "cmp:click", eventInfo: { path: "component.teaser-1" } }), {
    ...STATE["component.teaser-1"],
    "dlh:ownPath": "component.teaser-1",
    "dlh:ownId": "teaser-1",
    "dlh:parentComponent": "container",
  })
})

test("TODAY: eventInfo.reference wins over eventInfo.path", () => {
  const node = today({ event: "x", eventInfo: { reference: "component.link-2", path: "component.teaser-1" } })
  assert.equal(node["dc:title"], "Book")
})

test("TODAY: no parentId → dlh:parentComponent undefined", () => {
  assert.equal(today({ event: "x", eventInfo: { path: "component.link-2" } })["dlh:parentComponent"], undefined)
})

test("TODAY: unknown path or no eventInfo → undefined", () => {
  assert.equal(today({ event: "x", eventInfo: { path: "component.nope" } }), undefined)
  assert.equal(today({ event: "x" }), undefined)
})

// ---------- resolve_node: same results ----------

for (const message of [
  { event: "cmp:click", eventInfo: { path: "component.teaser-1" } },
  { event: "x", eventInfo: { reference: "component.link-2", path: "component.teaser-1" } },
  { event: "x", eventInfo: { path: "component.link-2" } },
  { event: "x", eventInfo: { path: "component.nope" } },
  { event: "x" },
]) {
  test(`resolve_node equals catch().get() for ${JSON.stringify(message.eventInfo || null)}`, () => {
    const expected = today(message)
    delete globalThis.window
    assert.deepEqual(resolve_node(message, { get_state }), expected, "raw ACDL event")
    assert.deepEqual(
      resolve_node({ $type: "adobe-client-data-layer:event", message }, { get_state }),
      expected,
      "Launch-wrapped event"
    )
  })
}

// ---------- resolve_node: what is new ----------

test("resolve_node does not mutate the state object it got", () => {
  const raw = { "@type": "site/x" }
  resolve_node({ event: "x", eventInfo: { path: "component.a" } }, { get_state: () => raw })
  assert.deepEqual(raw, { "@type": "site/x" })
})

test("resolve_node uses window.adobeDataLayer.getState when no state source is given", () => {
  globalThis.window = { adobeDataLayer: { getState: get_state } }
  assert.equal(resolve_node({ event: "x", eventInfo: { path: "component.link-2" } })["dc:title"], "Book")
})

test("resolve_node without any state source → undefined, no throw", () => {
  assert.equal(resolve_node({ event: "x", eventInfo: { path: "component.link-2" } }), undefined)
})

test("resolve_node: a throwing state source → undefined, no throw", () => {
  const throwing = () => {
    throw new Error("state boom")
  }
  assert.equal(resolve_node({ event: "x", eventInfo: { path: "component.a" } }, { get_state: throwing }), undefined)
})

test("resolve_node: non-object state (e.g. a string value) → undefined", () => {
  assert.equal(resolve_node({ event: "x", eventInfo: { path: "a.b" } }, { get_state: () => "text" }), undefined)
})

test("resolve_node: no / invalid event → undefined", () => {
  for (const e of [undefined, null, 5, "x", {}]) assert.equal(resolve_node(e, { get_state }), undefined)
})
