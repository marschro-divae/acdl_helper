/**
 * Tests for config-time tracking definitions in xdmtracker.
 *
 * A definition can be supplied two ways:
 *   1. at runtime via provider.define({ events, defaults })  (existing API)
 *   2. at init via the plugin config: plugins: { xdmtracker: { events, defaults } }
 *
 * The config-time path is applied during provider() setup (which runs
 * synchronously in init_plugins, before any plugin event handler is
 * registered), closing the init-ordering race against the page plugin's
 * setTimeout(0) page-load emit. A later define() overrides the config-time one.
 *
 * These also serve as characterization tests for the existing define()/track()
 * guard behavior (track before define is an error and sends nothing).
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import xdmtracker from "../src/plugins/xdmtracker/index.js"
import { make_logger } from "./helpers.js"

/**
 * Build a tracker provider with an optional plugin `config`, a recording alloy
 * stub, and a controllable component state for catch(event).get().
 */
function setup(config, cmp = {}) {
  const sent = []
  global.window = {
    alloy: (cmd, payload) => {
      sent.push(payload)
      return Promise.resolve({ propositions: [] })
    },
  }
  const logger = make_logger()
  const context = {
    logger,
    config,
    catch: () => ({ get: () => cmp }),
  }
  const api = xdmtracker().impl(context).provider
  const track = (name, send_opts) => api.track({ message: { event: name } }, send_opts)
  return { api, track, sent, logger }
}

const PAGEVIEW = { pageView: true, events: ["event1"] }

// --- characterization: existing runtime define()/track() behavior -----------

test("track() before any definition is an error and sends nothing", () => {
  const { track, sent, logger } = setup(undefined)
  const out = track("my-app:page-load")
  assert.equal(out, undefined)
  assert.equal(sent.length, 0)
  assert.equal(logger.calls.error.length, 1)
  assert.match(logger.calls.error[0][0], /not defined/)
})

test("runtime define() then track() sends the page view (existing API)", () => {
  const { api, track, sent } = setup(undefined)
  api.define({ events: { "my-app:page-load": PAGEVIEW } })
  track("my-app:page-load")
  assert.equal(sent.length, 1)
  assert.deepEqual(sent[0].xdm.web.webPageDetails.pageViews, { value: 1 })
})

test("empty plugin config ({}) stays a no-op — track() still needs define()", () => {
  const { track, sent, logger } = setup({})
  track("my-app:page-load")
  assert.equal(sent.length, 0)
  assert.match(logger.calls.error[0][0], /not defined/)
})

// --- new: config-time definitions -------------------------------------------

test("config-time events register during init — track() works immediately", () => {
  const { track, sent, logger } = setup({ events: { "my-app:page-load": PAGEVIEW } })
  // No define() call at all.
  track("my-app:page-load")
  assert.equal(sent.length, 1, "page view sent from a config-time definition")
  assert.deepEqual(sent[0].xdm.web.webPageDetails.pageViews, { value: 1 })
  // The definition is announced at setup time, not on first track().
  assert.equal(logger.calls.success.length >= 1, true)
  assert.match(logger.calls.success[0][0], /plugin config/)
})

test("config-time defaults are merged as the base layer", () => {
  const { track, sent } = setup({
    defaults: { eVars: [{ eVar1: "base" }] },
    events: { "my-app:page-load": { pageView: true, eVars: [{ eVar11: "page" }] } },
  })
  track("my-app:page-load")
  assert.equal(sent.length, 1)
  const evars = sent[0].xdm._experience.analytics.customDimensions.eVars
  assert.equal(evars.eVar1, "base", "default eVar applied")
  assert.equal(evars.eVar11, "page", "event eVar applied")
})

test("config-time resolver functions run against component state", () => {
  const { track, sent } = setup(
    { events: { "my-app:page-load": { pageView: true, eVars: [{ eVar20: (cmp) => cmp.title }] } } },
    { title: "Homepage" }
  )
  track("my-app:page-load")
  assert.equal(sent[0].xdm._experience.analytics.customDimensions.eVars.eVar20, "Homepage")
})

test("a later define() overrides the config-time definition (with warning)", () => {
  const { api, track, sent, logger } = setup({
    events: { "my-app:page-load": { pageView: true, eVars: [{ eVar11: "from-config" }] } },
  })
  api.define({ events: { "my-app:page-load": { pageView: true, eVars: [{ eVar11: "from-define" }] } } })
  assert.equal(
    logger.calls.warning.some((a) => /already defined/.test(a[0])),
    true,
    "overwrite is warned"
  )
  track("my-app:page-load")
  assert.equal(sent.length, 1)
  assert.equal(sent[0].xdm._experience.analytics.customDimensions.eVars.eVar11, "from-define")
})

test("define() rejects a non-object config and defines nothing", () => {
  const { api, track, sent, logger } = setup()

  api.define(null)
  api.define("nope")
  api.define(["events"])

  assert.equal(logger.calls.error.length, 3)
  assert.ok(logger.calls.error.every(a => String(a[0]).includes("expects a config object")))
  track("whatever")
  assert.equal(sent.length, 0, "still undefined → nothing sent")
})

test("define() rejects a config whose events is missing or not an object", () => {
  const { api, logger } = setup()

  api.define({})
  api.define({ events: [] })
  api.define({ events: "x" })

  assert.equal(logger.calls.error.length, 3)
  assert.ok(logger.calls.error.every(a => String(a[0]).includes("requires config.events")))
})

test("define() rejects a non-object defaults", () => {
  const { api, logger } = setup()

  api.define({ events: {}, defaults: [] })

  assert.ok(logger.calls.error.some(a => String(a[0]).includes("defaults must be an object")))
})

test("config with only defaults (no events) is rejected — events are required", () => {
  const { track, sent, logger } = setup({ defaults: { eVars: [{ eVar1: "x" }] } })
  // No valid definition was stored → track() reports not-defined.
  track("my-app:page-load")
  assert.equal(sent.length, 0)
  assert.equal(
    logger.calls.error.some((a) => /requires config\.events/.test(a[0])),
    true
  )
})
