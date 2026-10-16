/**
 * Core listener registration (src/core/lib/utils.js → acdl.add_event_listener / remove_event_listener).
 *
 * Every listener of the library goes through these two functions: the core's dependency resolution, the
 * plugins' `meta.events` handlers, `page`, `xdmtracker` autoTrack.
 *
 * The fake data layer below mimics what ACDL 2.0.2 does in AEM (verified in the browser, feature doc
 * jentis-bridge §7.5): function pushes run immediately with the data layer as argument, listeners are called
 * with the data layer as `this` (for this.getState), and an exception in a listener propagates OUT of push()
 * and skips the later listeners for that event.
 */
import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import utils from "../src/core/lib/utils.js"

function fake_data_layer() {
  const listeners = [] // { event, handler, options }
  const dl = {
    getState: (path) => `state:${path}`,
    addEventListener(event, handler, options) {
      listeners.push({ event, handler, options })
    },
    removeEventListener(event, handler) {
      const i = listeners.findIndex((l) => l.event === event && l.handler === handler)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  const array = []
  array.push = (item) => {
    if (typeof item === "function") return item(dl)
    // ACDL: call matching listeners in order, `this` = data layer; an exception escapes push()
    for (const l of listeners.filter((l) => l.event === item.event)) l.handler.call(dl, item)
  }
  return { array, dl, listeners }
}

let fake
beforeEach(() => {
  fake = fake_data_layer()
  globalThis.window = { adobeDataLayer: fake.array }
})
afterEach(() => {
  delete globalThis.window
})

// ---------- characterization: what plugins rely on (must hold before and after the change) ----------

test("a registered listener is called with the event and the data layer as `this`", () => {
  const seen = []
  utils.acdl.add_event_listener("x:evt", function (event) {
    seen.push({ event: event.event, state: this.getState("component.a") })
  })
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.deepEqual(seen, [{ event: "x:evt", state: "state:component.a" }])
})

test("options (e.g. scope) are passed through to addEventListener", () => {
  utils.acdl.add_event_listener("x:evt", () => {}, { scope: "all" })
  assert.deepEqual(fake.listeners[0].options, { scope: "all" })
})

test("remove_event_listener removes what add_event_listener registered", () => {
  let calls = 0
  const handler = () => calls++
  utils.acdl.add_event_listener("x:evt", handler)
  utils.acdl.remove_event_listener("x:evt", handler)
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.equal(calls, 0)
  assert.equal(fake.listeners.length, 0)
})

test("one handler registered for two events can be removed per event", () => {
  let calls = 0
  const handler = () => calls++
  utils.acdl.add_event_listener("x:one", handler)
  utils.acdl.add_event_listener("x:two", handler)
  utils.acdl.remove_event_listener("x:one", handler)
  window.adobeDataLayer.push({ event: "x:one" })
  window.adobeDataLayer.push({ event: "x:two" })
  assert.equal(calls, 1, "only the still registered event calls it")
})

// ---------- the change: a throwing listener must not break the pushing code or the other listeners ----------

test("a throwing listener does not make push() throw", () => {
  utils.acdl.add_event_listener("x:evt", () => {
    throw new Error("listener boom")
  })
  assert.doesNotThrow(() => window.adobeDataLayer.push({ event: "x:evt" }))
})

test("a throwing listener does not skip the listeners registered after it", () => {
  const order = []
  utils.acdl.add_event_listener("x:evt", () => order.push("before"))
  utils.acdl.add_event_listener("x:evt", () => {
    throw new Error("listener boom")
  })
  utils.acdl.add_event_listener("x:evt", () => order.push("after"))
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.deepEqual(order, ["before", "after"])
})

test("a throwing listener keeps working for the next event", () => {
  let calls = 0
  utils.acdl.add_event_listener("x:evt", () => {
    calls++
    throw new Error("listener boom")
  })
  window.adobeDataLayer.push({ event: "x:evt" })
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.equal(calls, 2)
})

// ---------- subscribe(): deferred registration (new in 1.11.0) ----------

const next_macrotask = () => new Promise((resolve) => setTimeout(resolve, 0))

test("subscribe registers only after the current task, not synchronously", async () => {
  let calls = 0
  utils.acdl.subscribe("x:evt", () => calls++)
  assert.equal(fake.listeners.length, 0, "not registered synchronously")
  await next_macrotask()
  assert.equal(fake.listeners.length, 1)
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.equal(calls, 1)
})

test("subscribe passes options through and guards the handler", async () => {
  utils.acdl.subscribe(
    "x:evt",
    () => {
      throw new Error("boom")
    },
    { scope: "all" }
  )
  await next_macrotask()
  assert.deepEqual(fake.listeners[0].options, { scope: "all" })
  assert.doesNotThrow(() => window.adobeDataLayer.push({ event: "x:evt" }))
})

test("unsubscribe after registration removes the listener", async () => {
  let calls = 0
  const unsubscribe = utils.acdl.subscribe("x:evt", () => calls++)
  await next_macrotask()
  unsubscribe()
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.equal(calls, 0)
  assert.equal(fake.listeners.length, 0)
})

test("unsubscribe before registration prevents it", async () => {
  const unsubscribe = utils.acdl.subscribe("x:evt", () => {})
  unsubscribe()
  await next_macrotask()
  assert.equal(fake.listeners.length, 0)
})

test("subscribe works when destructured (no reliance on `this`)", async () => {
  const { subscribe } = utils.acdl
  let calls = 0
  subscribe("x:evt", () => calls++)
  await next_macrotask()
  window.adobeDataLayer.push({ event: "x:evt" })
  assert.equal(calls, 1)
})
