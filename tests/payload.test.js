/**
 * Characterization tests for build_payload — lock the CURRENT behavior so the
 * v1.7.0 enhancement (fetchOnly + personalization) cannot regress page-view /
 * link-click semantics. New-behavior assertions live in payload.new.test.js.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { build_payload } from "../src/plugins/xdmtracker/lib/payload.js"
import { make_logger } from "./helpers.js"

test("pageView:true → webPageDetails.pageViews, page-view eventType, no webInteraction", () => {
  const log = make_logger()
  const p = build_payload("acdl_helper:page:load", { pageView: true }, {}, {}, null, log)

  assert.deepEqual(p.xdm.web.webPageDetails.pageViews, { value: 1 })
  assert.equal(p.type, "web.webpagedetails.pageViews")
  assert.equal(p.xdm.web.webInteraction, undefined)
  assert.equal(p.renderDecisions, false)
  assert.equal(p.documentUnloading, false)
})

test("default (no pageView) → link-click semantics, name defaults to event key", () => {
  const log = make_logger()
  const p = build_payload("cmp:click", {}, {}, {}, null, log)

  assert.deepEqual(p.xdm.web.webInteraction, {
    name: "cmp:click",
    type: "other",
    linkClicks: { value: 1 },
  })
  assert.equal(p.type, "web.webInteraction.linkClicks")
  assert.equal(p.xdm.web.webPageDetails, undefined)
})

test("webInteractionName / webInteractionType overrides are honored", () => {
  const log = make_logger()
  const p = build_payload(
    "dl:download",
    { webInteractionName: "brochure", webInteractionType: "download" },
    {},
    {},
    null,
    log
  )

  assert.equal(p.xdm.web.webInteraction.name, "brochure")
  assert.equal(p.xdm.web.webInteraction.type, "download")
})

test("invalid webInteractionType falls back to 'other' and warns", () => {
  const log = make_logger()
  const p = build_payload("x:y", { webInteractionType: "bogus" }, {}, {}, null, log)

  assert.equal(p.xdm.web.webInteraction.type, "other")
  assert.equal(log.calls.warning.length, 1)
})

test("eventType override is used for link events (no warning)", () => {
  const log = make_logger()
  const p = build_payload("x:y", { eventType: "my.custom.type" }, {}, {}, null, log)

  assert.equal(p.type, "my.custom.type")
  assert.equal(log.calls.warning.length, 0)
})

test("pageView:true with a mismatched eventType still sends but warns", () => {
  const log = make_logger()
  const p = build_payload("x:y", { pageView: true, eventType: "weird" }, {}, {}, null, log)

  assert.equal(p.type, "weird")
  assert.equal(log.calls.warning.length, 1)
})

test("datastreamId → edgeConfigOverrides (def precedence over send_opts)", () => {
  const log = make_logger()
  const a = build_payload("x:y", { datastreamId: "abc" }, {}, {}, null, log)
  assert.deepEqual(a.edgeConfigOverrides, { datastreamId: "abc" })

  const b = build_payload("x:y", {}, {}, { datastreamId: "from-opts" }, null, log)
  assert.deepEqual(b.edgeConfigOverrides, { datastreamId: "from-opts" })

  const c = build_payload("x:y", {}, {}, {}, null, log)
  assert.equal(c.edgeConfigOverrides, undefined)
})

test("data passthrough (def or send_opts)", () => {
  const log = make_logger()
  const a = build_payload("x:y", { data: { foo: 1 } }, {}, {}, null, log)
  assert.deepEqual(a.data, { foo: 1 })

  const b = build_payload("x:y", {}, {}, { data: { bar: 2 } }, null, log)
  assert.deepEqual(b.data, { bar: 2 })
})

test("renderDecisions / documentUnloading: def → send_opts → false", () => {
  const log = make_logger()

  assert.equal(build_payload("x", { renderDecisions: true }, {}, {}, null, log).renderDecisions, true)
  assert.equal(build_payload("x", {}, {}, { renderDecisions: true }, null, log).renderDecisions, true)
  assert.equal(build_payload("x", {}, {}, {}, null, log).renderDecisions, false)

  assert.equal(build_payload("x", { documentUnloading: true }, {}, {}, null, log).documentUnloading, true)
  assert.equal(build_payload("x", {}, {}, {}, null, log).documentUnloading, false)
})

test("defaults are merged as a base layer beneath the event definition", () => {
  const log = make_logger()
  const defaults = { eVars: [{ eVar1: () => "berater-x" }] }
  const p = build_payload("acdl_helper:page:load", { pageView: true }, {}, {}, defaults, log)

  assert.equal(p.xdm._experience.analytics.customDimensions.eVars.eVar1, "berater-x")
  assert.deepEqual(p.xdm.web.webPageDetails.pageViews, { value: 1 })
})
