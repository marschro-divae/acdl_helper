/**
 * CHARACTERIZATION tests — lock the CURRENT (v1.9.1) single-instance behavior of
 * xdmtracker before the multi-org `targets` refactor.
 *
 * These assertions describe behavior that MUST NOT change when the plugin gains
 * multiple send targets: with no `targets` configured, everything below has to keep
 * behaving byte-identically. They are deliberately end-to-end (through `track()`,
 * not through `build_payload` directly) because the refactor moves exactly the code
 * between those two layers:
 *
 *   - the complete `sendEvent` envelope, asserted with deepEqual (not field spot-checks)
 *   - `track()` returns THE payload object — a single object, never a map or array
 *   - the send goes through `window.alloy` and nothing else on `window` is touched
 *   - resolver functions are evaluated exactly ONCE per track() call
 *   - init() errors when `window.alloy` is missing
 *
 * See DOCS/FEATURES/xdmtracker-multi-org-targets/README.md §5 (Backward compatibility).
 * DO NOT relax these while implementing the feature — a failure here means the
 * single-org contract broke.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import xdmtracker from "../src/plugins/xdmtracker/index.js"
import { make_logger } from "./helpers.js"

/**
 * Build a provider with a recording alloy stub plus a SECOND recording global
 * ("volkswagen") that today must never be called — it proves there is no fan-out
 * yet, and after the refactor it proves fan-out only happens when configured.
 */
function setup(config, cmp = {}, alloy_impl) {
  const sent = []
  const other_sent = []
  global.window = {
    alloy: (cmd, payload) => {
      sent.push({ cmd, payload })
      return alloy_impl ? alloy_impl(cmd, payload) : Promise.resolve({})
    },
    volkswagen: (cmd, payload) => {
      other_sent.push({ cmd, payload })
      return Promise.resolve({})
    },
  }
  const context = {
    logger: make_logger(),
    config: config || {},
    catch: () => ({ get: () => cmp }),
  }
  const plugin = xdmtracker().impl(context)
  const api = plugin.provider
  const track = (name, send_opts) => api.track({ message: { event: name } }, send_opts)
  return { api, init: plugin.init, track, sent, other_sent, logger: context.logger }
}

test("page view: the complete sendEvent envelope is unchanged", () => {
  const { api, track, sent } = setup(null, { title: "Golf GTI" })
  api.define({
    defaults: { eVars: [{ eVar1: () => "https://example.com/golf" }] },
    events: {
      "app:page": {
        pageView: true,
        events: ["event1"],
        eVars: [{ eVar11: "app:page" }],
        props: [{ prop1: cmp => cmp.title }],
      },
    },
  })

  track("app:page")

  assert.equal(sent.length, 1)
  assert.equal(sent[0].cmd, "sendEvent")
  assert.deepEqual(sent[0].payload, {
    xdm: {
      _experience: {
        analytics: {
          customDimensions: {
            eVars: { eVar1: "https://example.com/golf", eVar11: "app:page" },
            props: { prop1: "Golf GTI" },
          },
          event1to100: { event1: { value: 1 } },
        },
      },
      web: { webPageDetails: { pageViews: { value: 1 } } },
    },
    type: "web.webpagedetails.pageViews",
    renderDecisions: false,
    documentUnloading: false,
  })
})

test("link click: the complete sendEvent envelope is unchanged", () => {
  const { api, track, sent } = setup()
  api.define({
    defaults: { eVars: [{ eVar1: () => "https://example.com/golf" }] },
    events: { "cmp:click": { events: ["event2"], eVars: [{ eVar11: "cmp:click" }] } },
  })

  track("cmp:click")

  assert.deepEqual(sent[0].payload, {
    xdm: {
      _experience: {
        analytics: {
          customDimensions: { eVars: { eVar1: "https://example.com/golf", eVar11: "cmp:click" } },
          event1to100: { event2: { value: 1 } },
        },
      },
      web: {
        webInteraction: { name: "cmp:click", type: "other", linkClicks: { value: 1 } },
      },
    },
    type: "web.webInteraction.linkClicks",
    renderDecisions: false,
    documentUnloading: false,
  })
})

test("fetchOnly prefetch: skips defaults, disables AA, carries an empty web object", () => {
  const { api, track, sent } = setup()
  api.define({
    defaults: { eVars: [{ eVar1: () => "https://example.com/golf" }] },
    events: {
      "app:init": {
        fetchOnly: true,
        renderDecisions: true,
        personalization: { sendDisplayEvent: false },
      },
    },
  })

  track("app:init")

  assert.deepEqual(sent[0].payload, {
    xdm: { web: {} },
    type: "decisioning.propositionFetch",
    renderDecisions: true,
    documentUnloading: false,
    personalization: { sendDisplayEvent: false },
    edgeConfigOverrides: { com_adobe_analytics: { enabled: false } },
  })
})

test("track() returns THE payload object — one object, not a map or array", () => {
  const { api, track, sent } = setup()
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("cmp:click")

  assert.equal(typeof returned, "object")
  assert.ok(!Array.isArray(returned), "not an array")
  assert.ok(returned.xdm && returned.type, "the payload itself, not a keyed map of payloads")
  assert.equal(returned, sent[0].payload, "the very object handed to alloy")
})

test("the send goes through window.alloy — no other global is touched", () => {
  const { api, track, sent, other_sent } = setup()
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.length, 1, "window.alloy received the event")
  assert.equal(other_sent.length, 0, "no fan-out to any other instance without config")
})

test("resolvers are evaluated exactly once per track() call", () => {
  let default_calls = 0
  let event_calls = 0
  const { api, track } = setup()
  api.define({
    defaults: {
      eVars: [
        {
          eVar1: () => {
            default_calls++
            return "url"
          },
        },
      ],
    },
    events: {
      "app:page": {
        pageView: true,
        eVars: [
          {
            eVar20: () => {
              event_calls++
              return "x"
            },
          },
        ],
      },
    },
  })

  track("app:page")

  assert.equal(default_calls, 1, "defaults resolver runs once for a single target")
  assert.equal(event_calls, 1, "event resolver runs once for a single target")
})

test("init() errors when window.alloy is missing, and stays silent when present", () => {
  const { init, logger } = setup()
  init()
  assert.equal(logger.calls.error.length, 0, "alloy present → no error")

  const missing = setup()
  global.window = {} // alloy gone
  missing.init()
  assert.equal(missing.logger.calls.error.length, 1, "alloy missing → exactly one error")
  assert.match(String(missing.logger.calls.error[0][0]), /Web SDK/)
})

test("an event with no definition sends nothing and logs info", () => {
  const { api, track, sent, logger } = setup()
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("not:defined")

  assert.equal(sent.length, 0)
  assert.equal(returned, undefined)
  assert.ok(
    logger.calls.info.some(a => String(a[0]).includes("No definition")),
    "logs that there is no definition"
  )
})
