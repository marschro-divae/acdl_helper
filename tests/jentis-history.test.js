/**
 * jentis — state at an event (src/plugins/jentis/lib/history.js).
 * Merge rules and delivery order as observed with ACDL 2.0.2 in AEM (feature doc §7.5).
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { create_history_cursor, merge, apply_item, get_path } from "../src/plugins/jentis/lib/history.js"

// ---------- merge: the observed ACDL rules ----------

test("merge: observed in AEM — arrays by index, undefined and null delete, deep objects", () => {
  // exactly the spike: push 1, then push 2, getState() returned this
  const first = { arr: [1, 2, 3], keep: "k", drop: "d", nul: "n", nested: { a: 1, b: 2 } }
  const second = { arr: [9], drop: undefined, nul: null, nested: { b: 3 } }
  assert.deepEqual(merge(merge({}, first), second), { arr: [9, 2, 3], keep: "k", nested: { a: 1, b: 3 } })
})

test("merge never mutates its inputs", () => {
  const target = { a: { b: 1 }, list: [1] }
  const source = { a: { c: 2 }, list: [5, 6] }
  const snapshot = JSON.stringify({ target, source })
  merge(target, source)
  assert.equal(JSON.stringify({ target, source }), snapshot)
})

test("merge: primitives overwrite, objects replace primitives and vice versa", () => {
  assert.deepEqual(merge({ a: 1 }, { a: { b: 2 } }), { a: { b: 2 } })
  assert.deepEqual(merge({ a: { b: 2 } }, { a: "x" }), { a: "x" })
})

test("apply_item ignores event and eventInfo, folds the rest", () => {
  const state = apply_item({}, { event: "cmp:click", eventInfo: { path: "component.a" }, component: { a: { x: 1 } } })
  assert.deepEqual(state, { component: { a: { x: 1 } } })
})

test("apply_item ignores non-objects", () => {
  assert.deepEqual(
    apply_item({ a: 1 }, () => {}),
    { a: 1 }
  )
  assert.deepEqual(apply_item({ a: 1 }, null), { a: 1 })
})

test("get_path reads dotted paths, undefined when missing", () => {
  const state = { component: { "teaser-1": { "dc:title": "T" } } }
  assert.deepEqual(get_path(state, "component.teaser-1"), { "dc:title": "T" })
  assert.equal(get_path(state, "component.nope"), undefined)
  assert.equal(get_path(state, ""), undefined)
})

// ---------- cursor: state at the event ----------

const click = (path, extra = {}) => ({ event: "cmp:click", eventInfo: { path }, ...extra })

test("a replayed event sees the state at its own position, not a later push", () => {
  const items = [
    { component: { a: { v: 1 } } },
    click("component.a"),
    { component: { a: { v: 2 } } }, // pushed AFTER the click — must not be visible to it
  ]
  const cursor = create_history_cursor(() => items)
  assert.equal(get_path(cursor.state_at(click("component.a")), "component.a").v, 1)
})

test("data pushed together with the event is part of its state", () => {
  const items = [
    { component: { s: { trigger: "old" } } },
    { event: "slider:navigate", eventInfo: { reference: "component.s" }, component: { s: { trigger: "next" } } },
  ]
  const cursor = create_history_cursor(() => items)
  const state = cursor.state_at({ event: "slider:navigate", eventInfo: { reference: "component.s" } })
  assert.equal(get_path(state, "component.s").trigger, "next")
})

test("events are matched in order; identical events each get their own state", () => {
  const items = [
    { component: { a: { n: 1 } } },
    click("component.a"),
    { component: { a: { n: 2 } } },
    click("component.a"),
  ]
  const cursor = create_history_cursor(() => items)
  assert.equal(get_path(cursor.state_at(click("component.a")), "component.a").n, 1)
  assert.equal(get_path(cursor.state_at(click("component.a")), "component.a").n, 2)
})

test("other scripts' pushes between events do not disturb the matching", () => {
  const items = [
    { foreign: { x: 1 } },
    { event: "other:thing" },
    { component: { a: { v: 1 } } },
    { event: "third:party", eventInfo: { foo: 1 } },
    click("component.a"),
  ]
  const cursor = create_history_cursor(() => items)
  const state = cursor.state_at(click("component.a"))
  assert.equal(get_path(state, "component.a").v, 1)
  assert.equal(state.foreign.x, 1, "earlier foreign data is part of the state, as in ACDL")
})

test("live: the array grows between calls — the cursor continues where it left off", () => {
  const items = [{ component: { a: { v: 1 } } }, click("component.a")]
  const cursor = create_history_cursor(() => items)
  cursor.state_at(click("component.a"))
  items.push({ component: { a: { v: 3 } } }, click("component.a"))
  assert.equal(get_path(cursor.state_at(click("component.a")), "component.a").v, 3)
})

test("eventInfo is compared by content, independent of key order", () => {
  const items = [{ event: "x", eventInfo: { path: "p", extra: 1 } }]
  const cursor = create_history_cursor(() => items)
  assert.ok(cursor.state_at({ event: "x", eventInfo: { extra: 1, path: "p" } }))
})

test("an event that is not in the array → undefined", () => {
  const cursor = create_history_cursor(() => [click("component.a")])
  assert.equal(cursor.state_at(click("component.b")), undefined)
})

test("states returned earlier are not changed by later folding", () => {
  const items = [
    { component: { a: { v: 1 } } },
    click("component.a"),
    { component: { a: { v: 2 } } },
    click("component.a"),
  ]
  const cursor = create_history_cursor(() => items)
  const first = cursor.state_at(click("component.a"))
  cursor.state_at(click("component.a"))
  assert.equal(get_path(first, "component.a").v, 1)
})

test("Core tabs: at cmp:show the tabs node still holds the PREVIOUS shownItems", () => {
  // the exact Core runtime order: cmp:show (new), cmp:hide (old), shownItems removed, shownItems set
  const items = [
    {
      component: {
        "tabs": { shownItems: ["tabs-item-a"] },
        "tabs-item-a": { parentId: "tabs" },
        "tabs-item-b": { parentId: "tabs" },
      },
    },
    { event: "cmp:show", eventInfo: { path: "component.tabs-item-b" } },
    { event: "cmp:hide", eventInfo: { path: "component.tabs-item-a" } },
    { component: { tabs: { shownItems: undefined } } },
    { component: { tabs: { shownItems: ["tabs-item-b"] } } },
  ]
  const cursor = create_history_cursor(() => items)
  const state = cursor.state_at({ event: "cmp:show", eventInfo: { path: "component.tabs-item-b" } })
  assert.deepEqual(get_path(state, "component.tabs").shownItems, ["tabs-item-a"])
})
