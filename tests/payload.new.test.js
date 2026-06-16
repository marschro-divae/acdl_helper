/**
 * New-behavior tests for v1.7.0: fetchOnly prefetch mode + personalization passthrough.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { build_payload } from "../src/plugins/xdmtracker/lib/payload.js"
import { make_logger } from "./helpers.js"

test("fetchOnly:true → propositionFetch type, no pageViews, no webInteraction", () => {
  const log = make_logger()
  const p = build_payload(
    "app:load",
    { fetchOnly: true, renderDecisions: true },
    {},
    {},
    null,
    log
  )

  assert.equal(p.type, "decisioning.propositionFetch")
  assert.equal(p.xdm.web.webPageDetails, undefined)
  assert.equal(p.xdm.web.webInteraction, undefined)
  assert.equal(p.renderDecisions, true)
  assert.equal(log.calls.warning.length, 0)
})

test("fetchOnly respects an explicit eventType override", () => {
  const log = make_logger()
  const p = build_payload("x:y", { fetchOnly: true, eventType: "custom.fetch" }, {}, {}, null, log)
  assert.equal(p.type, "custom.fetch")
})

test("personalization on the def is passed straight through", () => {
  const log = make_logger()
  const p = build_payload(
    "app:load",
    { fetchOnly: true, personalization: { sendDisplayEvent: false } },
    {},
    {},
    null,
    log
  )
  assert.deepEqual(p.personalization, { sendDisplayEvent: false })
})

test("personalization on the page view (includeRenderedPropositions) is passed through", () => {
  const log = make_logger()
  const p = build_payload(
    "acdl_helper:page:load",
    { pageView: true, personalization: { includeRenderedPropositions: true } },
    {},
    {},
    null,
    log
  )
  assert.deepEqual(p.xdm.web.webPageDetails.pageViews, { value: 1 })
  assert.deepEqual(p.personalization, { includeRenderedPropositions: true })
})

test("personalization precedence: def wins over send_opts; send_opts is the fallback", () => {
  const log = make_logger()

  const a = build_payload(
    "x",
    { personalization: { sendDisplayEvent: false } },
    {},
    { personalization: { sendDisplayEvent: true } },
    null,
    log
  )
  assert.deepEqual(a.personalization, { sendDisplayEvent: false })

  const b = build_payload("x", {}, {}, { personalization: { includeRenderedPropositions: true } }, null, log)
  assert.deepEqual(b.personalization, { includeRenderedPropositions: true })
})

test("no personalization key is added when none is configured", () => {
  const log = make_logger()
  const p = build_payload("x", { pageView: true }, {}, {}, null, log)
  assert.equal("personalization" in p, false)
})

test("fetchOnly skips defaults so the prefetch payload stays minimal", () => {
  const log = make_logger()
  const defaults = { eVars: [{ eVar1: () => "berater-x" }], props: [{ prop1: "p" }] }
  const p = build_payload("app:load", { fetchOnly: true, renderDecisions: true }, {}, {}, defaults, log)

  // none of the defaults' AA variables leak onto the prefetch
  assert.equal(p.xdm._experience, undefined)
  // a normal page view still gets the defaults (control)
  const pv = build_payload("page:show", { pageView: true }, {}, {}, defaults, log)
  assert.equal(pv.xdm._experience.analytics.customDimensions.eVars.eVar1, "berater-x")
})

test("fetchOnly auto-disables the Adobe Analytics service (deterministic AA suppression)", () => {
  const log = make_logger()
  const p = build_payload("app:load", { fetchOnly: true, renderDecisions: true }, {}, {}, null, log)
  assert.deepEqual(p.edgeConfigOverrides.com_adobe_analytics, { enabled: false })
})

test("fetchOnly AA suppression merges with datastreamId", () => {
  const log = make_logger()
  const p = build_payload("app:load", { fetchOnly: true, datastreamId: "ds-1" }, {}, {}, null, log)
  assert.equal(p.edgeConfigOverrides.datastreamId, "ds-1")
  assert.deepEqual(p.edgeConfigOverrides.com_adobe_analytics, { enabled: false })
})

test("fetchOnly merges with a user-supplied edgeConfigOverrides", () => {
  const log = make_logger()
  const p = build_payload(
    "app:load",
    { fetchOnly: true, edgeConfigOverrides: { com_adobe_target: { enabled: true } } },
    {},
    {},
    null,
    log
  )
  assert.deepEqual(p.edgeConfigOverrides.com_adobe_target, { enabled: true })
  assert.deepEqual(p.edgeConfigOverrides.com_adobe_analytics, { enabled: false })
})

test("an explicit com_adobe_analytics override wins over fetchOnly's default", () => {
  const log = make_logger()
  const p = build_payload(
    "app:load",
    { fetchOnly: true, edgeConfigOverrides: { com_adobe_analytics: { enabled: true } } },
    {},
    {},
    null,
    log
  )
  assert.deepEqual(p.edgeConfigOverrides.com_adobe_analytics, { enabled: true })
})

test("non-fetch events are never auto-disabled, but pass edgeConfigOverrides through", () => {
  const log = make_logger()

  const pv = build_payload("page:show", { pageView: true }, {}, {}, null, log)
  assert.equal(pv.edgeConfigOverrides, undefined)

  const withOverride = build_payload(
    "x",
    { edgeConfigOverrides: { com_adobe_analytics: { reportSuites: ["rsid"] } } },
    {},
    {},
    null,
    log
  )
  assert.deepEqual(withOverride.edgeConfigOverrides.com_adobe_analytics, { reportSuites: ["rsid"] })
})
