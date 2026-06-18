/**
 * Tests for xdmtracker `autoTrack`.
 *
 * With `plugins.xdmtracker.autoTrack: true`, the plugin registers its own
 * `adobeDataLayer:event` listener (scope:"all") during provider() setup and
 * tracks every matching event via its INTERNAL track — no external track rule,
 * no manual listener.
 *
 * A raw data-layer listener event carries `event`/`eventInfo` at the top level
 * and (unlike an Adobe Launch rule event) has NO `$type`. The plugin wraps it as
 * { message, $type } so that (a) track() resolves event.message.event and
 * (b) the core catch() — which only accepts events whose `$type` contains
 * "adobe-client-data-layer" — resolves component state. The `catch` stub below
 * mirrors that real contract, so a regression in the wrapping would fail tests.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import xdmtracker from "../src/plugins/xdmtracker/index.js"
import { make_logger, deferred } from "./helpers.js"

/**
 * Build a provider with a recording alloy stub, a recording acdl stub, and a
 * `catch` that mirrors event_catcher.is_dl_event (requires message + $type).
 * `emit(name, eventInfo)` simulates the ACDL invoking the registered listener
 * with a RAW event (top-level event/eventInfo, no $type).
 */
function setup(config, cmp = {}, alloy_impl) {
  const sent = []
  global.window = {
    alloy: (cmd, payload) => {
      sent.push(payload)
      return alloy_impl ? alloy_impl(cmd, payload) : Promise.resolve({ propositions: [] })
    },
  }
  const logger = make_logger()
  const registered = []
  let auto_handler = null
  const acdl = {
    add_event_listener: (evt, handler, opts) => {
      registered.push({ evt, opts })
      auto_handler = handler
    },
    push: () => {},
    remove_event_listener: () => {},
  }
  const context = {
    logger,
    config,
    acdl,
    catch: (event) => ({
      get: () => {
        const is_dl =
          event && event.message && event.$type && String(event.$type).includes("adobe-client-data-layer")
        return is_dl ? cmp : undefined
      },
    }),
  }
  const api = xdmtracker().impl(context).provider
  const emit = (name, eventInfo) => auto_handler && auto_handler({ event: name, eventInfo: eventInfo || {} })
  return { api, sent, logger, registered, emit, has_listener: () => auto_handler != null }
}

const PAGEVIEW = { pageView: true, events: ["event1"] }

test("autoTrack registers a single adobeDataLayer:event listener with scope:all", () => {
  const { registered } = setup({ events: { "app:page-load": PAGEVIEW }, autoTrack: true })
  assert.equal(registered.length, 1)
  assert.equal(registered[0].evt, "adobeDataLayer:event")
  assert.deepEqual(registered[0].opts, { scope: "all" })
})

test("autoTrack unset → no listener is registered (backward compatible)", () => {
  const { has_listener, registered } = setup({ events: { "app:page-load": PAGEVIEW } })
  assert.equal(has_listener(), false)
  assert.equal(registered.length, 0)
})

test("an emitted matching event is tracked automatically", () => {
  const { sent, emit } = setup({ events: { "app:page-load": PAGEVIEW }, autoTrack: true })
  emit("app:page-load", { path: "page" })
  assert.equal(sent.length, 1)
  assert.deepEqual(sent[0].xdm.web.webPageDetails.pageViews, { value: 1 })
})

test("component-derived resolvers resolve under autoTrack (proves the $type wrapping)", () => {
  const { sent, emit } = setup(
    { events: { "app:page-load": { pageView: true, eVars: [{ eVar20: (cmp) => cmp.title }] } }, autoTrack: true },
    { title: "Homepage" }
  )
  emit("app:page-load", { path: "page" })
  assert.equal(sent.length, 1)
  assert.equal(
    sent[0].xdm._experience.analytics.customDimensions.eVars.eVar20,
    "Homepage",
    "cmp resolved → catch() accepted the wrapped event"
  )
})

test("an emitted event with no matching definition is a no-op", () => {
  const { sent, emit, logger } = setup({ events: { "app:page-load": PAGEVIEW }, autoTrack: true })
  emit("cmp:show", { path: "some.component" })
  assert.equal(sent.length, 0)
  assert.equal(
    logger.calls.info.some((a) => /No definition for event/.test(a[0])),
    true
  )
})

test("render gate holds across replayed prefetch → page view via autoTrack", async () => {
  const render = deferred()
  const { sent, emit } = setup(
    {
      autoTrack: true,
      events: {
        "app:init": { fetchOnly: true, renderDecisions: true, personalization: { sendDisplayEvent: false } },
        "app:page-load": { pageView: true, personalization: { includeRenderedPropositions: true } },
      },
    },
    {},
    (cmd, payload) => (payload.renderDecisions === true ? render.promise : Promise.resolve({ propositions: [] }))
  )

  emit("app:init", { path: "app" }) // renders — sent immediately, gate captured
  assert.equal(sent.length, 1)
  emit("app:page-load", { path: "page" }) // waits for the render to settle
  assert.equal(sent.length, 1, "page view held until render settles")

  render.resolve({ propositions: [] })
  await new Promise((r) => setTimeout(r, 0))

  assert.equal(sent.length, 2, "page view fires after render settles")
  assert.deepEqual(sent[1].xdm.web.webPageDetails.pageViews, { value: 1 })
})

test("autoTrack also tracks when the definition came from a runtime define()", () => {
  // Definition supplied later via define(); the listener (registered at init)
  // uses the internal track, so a later-defined event still tracks.
  const { api, sent, emit } = setup({ autoTrack: true })
  api.define({ events: { "app:page-load": PAGEVIEW } })
  emit("app:page-load", { path: "page" })
  assert.equal(sent.length, 1)
})
