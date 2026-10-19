/**
 * jentis — lifecycle (src/plugins/jentis/lib/sender.js) and the plugin wiring (src/plugins/jentis/index.js).
 *
 * Part 1 drives the sender directly (fake `_jts`, manual timer). Part 2 runs the whole plugin against a fake
 * data layer that behaves like ACDL 2.0.2 in AEM (feature doc §7.5): the array keeps every data and event push,
 * function pushes run with the data layer, `scope: "all"` replays earlier events, `getState()` is the CURRENT
 * state, a listener gets a copy of the pushed item.
 */
import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { validate_config } from "../src/plugins/jentis/lib/validate.js"
import { create_sender } from "../src/plugins/jentis/lib/sender.js"
import { merge } from "../src/plugins/jentis/lib/history.js"
import jentis from "../src/plugins/jentis/index.js"
import utils from "../src/core/lib/utils.js"
import { matches } from "../src/core/lib/match.js"
import { link_type, family } from "../src/core/lib/link.js"
import { resolve_node } from "../src/core/lib/resolve_node.js"
import { make_logger } from "./helpers.js"

const CORE = Object.freeze({ matches, link_type, family, resolve_node })
const PAGE_LOAD = "acdl_helper:page:load"

const PAGE = {
  "@type": "site/components/content/page/contentPage",
  "dc:title": "Tabs",
  "dlh:pagename": "components:tabs",
}
const STATE = {
  page: { "contentPage-1": PAGE },
  component: { "link-1": { "@type": "site/components/link", "dc:title": "Parking", "xdm:linkURL": "/parking" } },
}

const CONFIG = {
  pageview: { props: { pagetitle: (page) => page["dc:title"] } },
  defaults: { props: { page_name: (cmp, h) => h.page()?.["dlh:pagename"] } },
  events: {
    "cmp:click": { match: { "@type": "*/link" }, group: "link", name: "link_click" },
    "cmp:hide": false,
  },
}

const PAGEVIEW_DOC = { track: "pageview", pagetitle: "Tabs" }
const CLICK_DOC = { track: "event", group: "link", name: "link_click", value: "Parking", page_name: "components:tabs" }
const click = () => ({ event: "cmp:click", eventInfo: { path: "component.link-1" } })
const page_load = () => ({ event: PAGE_LOAD, eventInfo: { path: "page.contentPage-1" } })

function setup(config_input = CONFIG, { jts = [] } = {}) {
  const { config, problems } = validate_config(config_input, { global_prefix: "acdl_helper" })
  assert.deepEqual(problems, [], "the test config itself is valid")
  const timers = []
  const reports = []
  const cancelled = []
  const sender = create_sender({
    config,
    core: CORE,
    get_jts: () => jts,
    get_page: () => PAGE,
    schedule: (fn, ms) => timers.push({ fn, ms }),
    cancel: (id) => cancelled.push(id),
    report: (kind, details) => reports.push({ kind, ...details }),
  })
  return { sender, jts, timers, cancelled, reports, config, fire: () => timers.forEach((t) => t.fn()) }
}

// ---------- Part 1: sender ----------

test("pageview: pageview document + submit, then events go out directly", () => {
  const { sender, jts } = setup()
  sender.start()
  sender.handle(page_load(), STATE)
  sender.handle(click(), STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }, CLICK_DOC])
})

test("events before the pageview are held and sent right after it, in order", () => {
  const { sender, jts } = setup()
  sender.start()
  sender.handle(click(), STATE)
  sender.handle({ ...click(), eventInfo: { path: "component.link-1" } }, STATE)
  assert.deepEqual(jts, [], "nothing before the pageview")
  assert.equal(sender.status().held, 2)
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }, CLICK_DOC, CLICK_DOC])
  assert.equal(sender.status().held, 0)
})

test("a held event keeps the state it had at event time", () => {
  const { sender, jts } = setup()
  sender.start()
  sender.handle(click(), STATE)
  const later = merge(STATE, { component: { "link-1": { "dc:title": "Changed later" } } })
  sender.handle(page_load(), later)
  assert.equal(jts[2].value, "Parking")
})

test("a second pageview event is ignored and reported", () => {
  const { sender, jts, reports } = setup()
  sender.start()
  sender.handle(page_load(), STATE)
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }])
  assert.ok(reports.some((r) => r.kind === "dropped" && r.reason === "pageview already sent"))
})

test("timeout: held events are flushed with a warning naming pageview.on; later events go out directly", () => {
  const { sender, jts, timers, reports, fire } = setup()
  sender.start()
  assert.equal(timers.length, 1)
  assert.equal(timers[0].ms, 5000, "default pageview_timeout")
  sender.handle(click(), STATE)
  fire()
  assert.deepEqual(jts, [CLICK_DOC])
  const timeout = reports.find((r) => r.kind === "timeout")
  assert.equal(timeout.on, PAGE_LOAD)
  assert.equal(timeout.held, 1)
  assert.match(timeout.message, /acdl_helper:page:load/)
  sender.handle(click(), STATE)
  assert.deepEqual(jts, [CLICK_DOC, CLICK_DOC], "no more holding after the timeout")
})

test("timeout: a late pageview is still sent, once", () => {
  const { sender, jts, fire } = setup()
  sender.start()
  fire()
  sender.handle(page_load(), STATE)
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }])
})

test("timeout after the pageview does nothing", () => {
  const { sender, jts, reports, fire, cancelled } = setup()
  sender.start()
  sender.handle(page_load(), STATE)
  assert.deepEqual(cancelled, [1], "timer cancelled with the pageview")
  fire()
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }])
  assert.equal(reports.filter((r) => r.kind === "timeout").length, 0)
  assert.equal(sender.status().timed_out, false)
})

test("pageview_timeout option is used", () => {
  const { timers, sender } = setup({ ...CONFIG, options: { pageview_timeout: 1200 } })
  sender.start()
  assert.equal(timers[0].ms, 1200)
})

test("pageview: false — no pageview, no holding, no timer; the page event is an ordinary event", () => {
  const config = { ...CONFIG, pageview: false }
  const { sender, jts, timers } = setup(config)
  sender.start()
  assert.equal(timers.length, 0)
  sender.handle(click(), STATE)
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [CLICK_DOC], "page event not configured in events → not ours")
})

test("custom pageview.on", () => {
  const { sender, jts } = setup({ ...CONFIG, pageview: { on: "acdl_helper:page:ready", props: {} } })
  sender.start()
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [])
  sender.handle({ event: "acdl_helper:page:ready", eventInfo: { path: "page.contentPage-1" } }, STATE)
  assert.deepEqual(jts, [{ track: "pageview" }, { track: "submit" }])
})

test("pageview without a resolvable page node is not sent; events stay held", () => {
  const { sender, jts, reports } = setup()
  sender.start()
  sender.handle(click(), STATE)
  sender.handle({ event: PAGE_LOAD }, { component: STATE.component })
  assert.deepEqual(jts, [])
  assert.ok(reports.some((r) => r.kind === "dropped" && r.reason === "no page node"))
  sender.handle(page_load(), STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }, CLICK_DOC])
})

test("pageview falls back to the page node of the state when the event has no path", () => {
  const { sender, jts } = setup()
  sender.handle({ event: PAGE_LOAD }, STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }])
})

test("unconfigured events are reported as ignored; `false` and unresolvable nodes as dropped", () => {
  const { sender, jts, reports } = setup()
  sender.handle(page_load(), STATE)
  sender.handle({ event: "cmp:show", eventInfo: { path: "component.link-1" } }, STATE)
  sender.handle({ event: "cmp:hide", eventInfo: { path: "component.link-1" } }, STATE)
  sender.handle({ event: "cmp:click", eventInfo: { path: "component.nothing" } }, STATE)
  sender.handle({}, STATE)
  sender.handle(undefined, STATE)
  assert.deepEqual(jts, [PAGEVIEW_DOC, { track: "submit" }])
  assert.deepEqual(
    reports.filter((r) => r.kind === "dropped").map((r) => r.reason),
    ["rule false", "no node"]
  )
  assert.deepEqual(
    reports.filter((r) => r.kind === "ignored").map((r) => r.event.event),
    ["cmp:show"],
    "events without a name are not reported at all"
  )
})

test("reports: pageview and event documents, problems of resolvers", () => {
  const config = {
    ...CONFIG,
    events: {
      "cmp:click": {
        group: "link",
        name: "link_click",
        props: {
          bad: () => {
            throw new Error("x")
          },
        },
      },
    },
  }
  const { sender, reports } = setup(config)
  sender.handle(page_load(), STATE)
  sender.handle(click(), STATE)
  assert.deepEqual(
    reports.map((r) => r.kind),
    ["pageview", "problems", "event"]
  )
  assert.equal(reports[2].rule_index, 0)
})

test("_jts is looked up at every push (JENTIS may replace the array)", () => {
  let jts = []
  const { config } = validate_config(CONFIG, { global_prefix: "acdl_helper" })
  const sender = create_sender({ config, core: CORE, get_jts: () => jts, get_page: () => PAGE, schedule: () => {} })
  sender.handle(page_load(), STATE)
  const first = jts
  jts = []
  sender.handle(click(), STATE)
  assert.equal(first.length, 2)
  assert.deepEqual(jts, [CLICK_DOC])
})

// ---------- Part 2: the plugin against a fake ACDL ----------

// `acdl_order: true` — the real ACDL 2.0.2 order (feature doc §7.6): state update and listeners first, the item
// is appended to the array AFTER the listeners ran. Without it the item is appended first (how the tests below
// were written; it is also how a replayed event finds its item).
function fake_acdl({ acdl_order = false } = {}) {
  const listeners = []
  let state = {}
  const dl = {
    getState: (path) => (path ? path.split(".").reduce((o, k) => o?.[k], state) : state),
    addEventListener(event, handler, options) {
      listeners.push({ event, handler })
      if (options?.scope === "all") {
        for (const item of array.filter((i) => i && i.event)) deliver({ event, handler }, item)
      }
    },
    removeEventListener(event, handler) {
      const i = listeners.findIndex((l) => l.event === event && l.handler === handler)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  const array = []
  const native_push = Array.prototype.push
  function deliver(listener, item) {
    if (listener.event === "adobeDataLayer:event" || listener.event === item.event) {
      listener.handler.call(dl, structuredClone_safe(item))
    }
  }
  array.push = (item) => {
    if (typeof item === "function") return item(dl)
    if (!acdl_order) native_push.call(array, item)
    const { event, eventInfo, ...data } = item
    state = merge(state, data)
    if (event) for (const l of listeners.slice()) deliver(l, item)
    if (acdl_order) native_push.call(array, item)
  }
  return { array, dl }
}

function structuredClone_safe(item) {
  return JSON.parse(JSON.stringify(item))
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function start_plugin(config) {
  const logger = make_logger()
  const plugin = jentis()
  const impl = plugin.impl(
    Object.freeze({
      logger,
      config,
      event_prefix: "acdl_helper:jentis",
      acdl: utils.acdl,
      catch: undefined,
      shared: {},
      helpers: CORE,
    })
  )
  impl.init()
  return { logger }
}

let fake
beforeEach(() => {
  fake = fake_acdl()
  globalThis.window = { adobeDataLayer: fake.array }
})
afterEach(() => {
  delete globalThis.window
})

test("plugin: replayed events see their own historical state, pageview first, _jts created", async () => {
  // pushed BEFORE the plugin starts — replayed through scope "all"
  window.adobeDataLayer.push({ component: STATE.component })
  window.adobeDataLayer.push(click())
  window.adobeDataLayer.push({ component: { "link-1": { "dc:title": "Changed later" } } })
  window.adobeDataLayer.push({ page: STATE.page })
  window.adobeDataLayer.push(page_load())

  start_plugin(CONFIG)
  assert.equal(window._jts, undefined, "the subscription is deferred")
  await tick()

  assert.deepEqual(window._jts, [PAGEVIEW_DOC, { track: "submit" }, { ...CLICK_DOC, value: "Parking" }])

  // live events after the replay
  window.adobeDataLayer.push(click())
  assert.deepEqual(window._jts.at(-1), { ...CLICK_DOC, value: "Changed later" })
})

test("plugin: keeps an existing _jts (JENTIS loaded first)", async () => {
  const existing = [{ track: "something-of-jentis" }]
  window._jts = existing
  window.adobeDataLayer.push({ page: STATE.page })
  window.adobeDataLayer.push(page_load())
  start_plugin(CONFIG)
  await tick()
  assert.equal(window._jts, existing)
  assert.deepEqual(existing, [{ track: "something-of-jentis" }, PAGEVIEW_DOC, { track: "submit" }])
})

test("plugin: an event missing from the array falls back to the current state", async () => {
  window.adobeDataLayer.push({ page: STATE.page, component: STATE.component })
  window.adobeDataLayer.push(page_load())
  start_plugin(CONFIG)
  await tick()
  window.adobeDataLayer.length = 0 // another script empties the array
  window.adobeDataLayer.push(click())
  // the push re-adds the item, but the cursor's position is past it → not found → this.getState()
  assert.deepEqual(window._jts.at(-1), CLICK_DOC)
})

test("plugin: a throwing resolver never breaks the data layer push", async () => {
  const config = {
    ...CONFIG,
    events: {
      "cmp:click": {
        group: () => {
          throw new Error("boom")
        },
        name: "n",
      },
    },
  }
  window.adobeDataLayer.push({ page: STATE.page, component: STATE.component })
  window.adobeDataLayer.push(page_load())
  start_plugin(config)
  await tick()
  assert.doesNotThrow(() => window.adobeDataLayer.push(click()))
  assert.deepEqual(window._jts, [PAGEVIEW_DOC, { track: "submit" }])
})

test("plugin: invalid config is reported via the logger, the valid rest runs", async () => {
  const config = { ...CONFIG, events: { ...CONFIG.events, "x:broken": { name: "no group" } } }
  window.adobeDataLayer.push({ page: STATE.page, component: STATE.component })
  window.adobeDataLayer.push(page_load())
  const { logger } = start_plugin(config)
  await tick()
  window.adobeDataLayer.push(click())
  assert.ok(logger.calls.error.some(([m]) => m.includes("events['x:broken']") && m.includes("group")))
  assert.deepEqual(window._jts, [PAGEVIEW_DOC, { track: "submit" }, CLICK_DOC])
})

test("reports: held events, and the per-rule outcome when no rule applies", () => {
  const config = {
    ...CONFIG,
    events: {
      "cmp:click": [
        { match: { "@type": "*/teaser" }, group: "teaser", name: "teaser_click" },
        { skip: () => true, group: "link", name: "link_click" },
      ],
    },
  }
  const { sender, reports } = setup(config)
  sender.start()
  sender.handle(click(), STATE)
  sender.handle(page_load(), STATE)
  assert.deepEqual(
    reports.map((r) => r.kind),
    ["held", "pageview", "dropped"]
  )
  assert.equal(reports[2].reason, "no matching rule")
  assert.deepEqual(reports[2].rules, ["match", "skip"])
})

test("reports: truncated keys of a document", () => {
  const { sender, reports } = setup({ ...CONFIG, options: { max_value_length: 3 } })
  sender.handle(page_load(), STATE)
  sender.handle(click(), STATE)
  assert.deepEqual(reports.find((r) => r.kind === "pageview").truncated, ["pagetitle"])
  assert.deepEqual(reports.find((r) => r.kind === "event").truncated.sort(), ["page_name", "value"])
})

test("plugin: forwarded and dropped events are logged through the plugin logger", async () => {
  window.adobeDataLayer.push({ page: STATE.page, component: STATE.component })
  window.adobeDataLayer.push(page_load())
  const { logger } = start_plugin(CONFIG)
  await tick()
  window.adobeDataLayer.push(click())
  window.adobeDataLayer.push({ event: "cmp:hide", eventInfo: { path: "component.link-1" } })
  assert.deepEqual(
    logger.calls.success.map(([m]) => m),
    ["pageview (acdl_helper:page:load page.contentPage-1)", "cmp:click component.link-1 → link / link_click"]
  )
  assert.ok(logger.calls.info.some(([m]) => m === "cmp:hide component.link-1 not forwarded: rule false"))
})

test("plugin: options.log false mutes the per-event log, not the validation problems", async () => {
  const config = { ...CONFIG, options: { log: false }, events: { ...CONFIG.events, "x:broken": { name: "n" } } }
  window.adobeDataLayer.push({ page: STATE.page, component: STATE.component })
  window.adobeDataLayer.push(page_load())
  const { logger } = start_plugin(config)
  await tick()
  window.adobeDataLayer.push(click())
  assert.deepEqual(window._jts, [PAGEVIEW_DOC, { track: "submit" }, CLICK_DOC], "sending is unaffected")
  assert.equal(logger.calls.success.length + logger.calls.info.length, 0)
  assert.equal(logger.calls.error.length, 1, "the invalid rule is still reported")
})

// ---------- the plugin against the real ACDL order: listeners run before the item is appended (§7.6) ----------

const ROW_STATE = {
  page: STATE.page,
  component: {
    "slider-1": { "@type": "site/components/slider", "dc:title": "Offers" },
    "row-1": { "@type": "site/components/accordion/row", "dc:title": "First Row" },
  },
}
const STATEFUL_CONFIG = {
  ...CONFIG,
  events: {
    "slider:autoplay": { group: "slider", name: "slider_autoplay", value: (cmp) => cmp.state },
    "accordion:toggle": { skip: (cmp) => cmp.state !== "open", group: "accordion", name: "accordion_open" },
  },
}
const autoplay = (state) => ({
  event: "slider:autoplay",
  eventInfo: { reference: "component.slider-1" },
  component: { "slider-1": { state } },
})
const toggle = (state) => ({
  event: "accordion:toggle",
  eventInfo: { reference: "component.row-1" },
  component: { "row-1": { state } },
})
const events_sent = () => window._jts.filter((d) => d.track === "event").map((d) => `${d.name}:${d.value}`)

async function start_with_acdl_order() {
  fake = fake_acdl({ acdl_order: true })
  window.adobeDataLayer = fake.array
  window.adobeDataLayer.push(ROW_STATE)
  window.adobeDataLayer.push(page_load())
  start_plugin(STATEFUL_CONFIG)
  await tick()
}

test("plugin (ACDL order): repeated identical events each carry their own state", async () => {
  await start_with_acdl_order()
  window.adobeDataLayer.push(autoplay("pause"))
  window.adobeDataLayer.push(autoplay("play"))
  window.adobeDataLayer.push(autoplay("pause"))
  assert.deepEqual(events_sent(), ["slider_autoplay:pause", "slider_autoplay:play", "slider_autoplay:pause"])
})

test("plugin (ACDL order): a skip reading the event's own state skips exactly those events", async () => {
  await start_with_acdl_order()
  window.adobeDataLayer.push(toggle("open"))
  window.adobeDataLayer.push(toggle("close"))
  window.adobeDataLayer.push(toggle("open"))
  window.adobeDataLayer.push(toggle("close"))
  assert.deepEqual(events_sent(), ["accordion_open:First Row", "accordion_open:First Row"])
})

test("plugin (ACDL order): replayed events, then live ones — each with its own state", async () => {
  fake = fake_acdl({ acdl_order: true })
  window.adobeDataLayer = fake.array
  window.adobeDataLayer.push(ROW_STATE)
  window.adobeDataLayer.push(autoplay("pause")) // before the plugin starts — replayed
  window.adobeDataLayer.push(autoplay("play"))
  window.adobeDataLayer.push(page_load())
  start_plugin(STATEFUL_CONFIG)
  await tick()
  window.adobeDataLayer.push(autoplay("pause")) // live
  window.adobeDataLayer.push(autoplay("play"))
  assert.deepEqual(events_sent(), [
    "slider_autoplay:pause",
    "slider_autoplay:play",
    "slider_autoplay:pause",
    "slider_autoplay:play",
  ])
})

test("plugin (ACDL order): a listener that pushes during the dispatch (nested push)", async () => {
  await start_with_acdl_order()
  // another script reacts to the toggle by pausing the slider — its item is appended before the toggle's
  fake.dl.addEventListener("accordion:toggle", () => window.adobeDataLayer.push(autoplay("pause")))
  window.adobeDataLayer.push(toggle("open"))
  window.adobeDataLayer.push(autoplay("play"))
  window.adobeDataLayer.push(toggle("close"))
  window.adobeDataLayer.push(toggle("open"))
  assert.deepEqual(events_sent(), [
    "accordion_open:First Row",
    "slider_autoplay:pause",
    "slider_autoplay:play",
    "slider_autoplay:pause", // nested, from the close (the close itself is skipped)
    "accordion_open:First Row",
    "slider_autoplay:pause", // nested, from the last open
  ])
})
