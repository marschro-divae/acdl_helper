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

// ---------- live events: ACDL calls the listeners BEFORE it appends the item (feature doc §7.6) ----------

// ACDL 2.0.2: `push` updates the state, calls the listeners, and only then `Array.prototype.push`. A live
// listener therefore asks for an event whose item is not in the array yet.
function push_live(items, cursor, item) {
  const result = cursor.state_at(JSON.parse(JSON.stringify(item)))
  items.push(item)
  return result
}

const toggle = (state) => ({
  event: "accordion:toggle",
  eventInfo: { reference: "component.row" },
  component: { row: { state } },
})

test("live: an event whose item is not in the array yet → undefined (the plugin uses this.getState())", () => {
  const items = [{ component: { row: { "dc:title": "Row" } } }]
  const cursor = create_history_cursor(() => items)
  assert.equal(push_live(items, cursor, toggle("open")), undefined)
})

test("live: a repeated identical event is never matched to the previous one's item", () => {
  const items = [{ component: { row: { "dc:title": "Row" } } }]
  const cursor = create_history_cursor(() => items)
  push_live(items, cursor, toggle("open"))
  assert.equal(push_live(items, cursor, toggle("close")), undefined, "not the state of the open")
  assert.equal(push_live(items, cursor, toggle("open")), undefined, "not the state of the close")
})

test("live: the items of live events are still folded — a later lookup sees their data", () => {
  const items = [{ component: { row: { "dc:title": "Row" } } }]
  const cursor = create_history_cursor(() => items)
  push_live(items, cursor, toggle("open"))
  push_live(items, cursor, toggle("close"))
  items.push({ component: { row: { extra: 1 } } }, { event: "x:found", eventInfo: { path: "component.row" } })
  const state = cursor.state_at({ event: "x:found", eventInfo: { path: "component.row" } })
  assert.deepEqual(get_path(state, "component.row"), { "dc:title": "Row", "state": "close", "extra": 1 })
})

test("live: a nested push (inner item appended before the outer one) is folded, neither is matched", () => {
  const items = [{ component: { a: { v: 0 } } }]
  const cursor = create_history_cursor(() => items)
  const outer = { event: "outer:evt", eventInfo: { path: "component.a" }, component: { a: { v: 1 } } }
  const inner = { event: "inner:evt", eventInfo: { path: "component.a" }, component: { a: { w: 2 } } }
  // outer's listener pushes inner: both are asked for, then ACDL appends inner first, outer last
  assert.equal(cursor.state_at(JSON.parse(JSON.stringify(outer))), undefined)
  assert.equal(cursor.state_at(JSON.parse(JSON.stringify(inner))), undefined)
  items.push(inner, outer)
  assert.equal(push_live(items, cursor, { ...outer, component: { a: { v: 3 } } }), undefined)
  assert.equal(push_live(items, cursor, { ...inner, component: { a: { w: 4 } } }), undefined)
  items.push({ event: "x:found", eventInfo: { path: "component.a" } })
  const state = cursor.state_at({ event: "x:found", eventInfo: { path: "component.a" } })
  assert.deepEqual(get_path(state, "component.a"), { v: 3, w: 4 })
})

test("replay, then live: replayed events match their items, later live events never do", () => {
  const items = [{ component: { row: { "dc:title": "Row" } } }, toggle("open"), toggle("close")]
  const cursor = create_history_cursor(() => items)
  assert.equal(get_path(cursor.state_at(toggle("open")), "component.row").state, "open")
  assert.equal(get_path(cursor.state_at(toggle("close")), "component.row").state, "close")
  assert.equal(push_live(items, cursor, toggle("open")), undefined)
  assert.equal(push_live(items, cursor, toggle("close")), undefined)
})
