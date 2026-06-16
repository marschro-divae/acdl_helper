/**
 * Characterization tests for the Adobe Analytics XDM mapping helpers.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  event_path_for,
  coerce_events_into_xdm,
  coerce_kv_array_into_xdm,
} from "../src/plugins/xdmtracker/lib/aa-mapping.js"
import { make_logger } from "./helpers.js"

test("event_path_for maps events into the correct 100-bucket", () => {
  assert.equal(event_path_for("event1"), "_experience.analytics.event1to100.event1")
  assert.equal(event_path_for("event100"), "_experience.analytics.event1to100.event100")
  assert.equal(event_path_for("event101"), "_experience.analytics.event101to200.event101")
  assert.equal(event_path_for("event1000"), "_experience.analytics.event901to1000.event1000")
})

test("event_path_for returns null for out-of-range or malformed names", () => {
  assert.equal(event_path_for("event1001"), null)
  assert.equal(event_path_for("foo"), null)
})

// Characterization of a known latent quirk: "event0" matches /^event(\d+)$/ and,
// because the n>=1 guard fails before the n<=200 bucket, it currently resolves to
// event101to200.event0 instead of null. Locked here so we notice if it ever changes.
// (Not fixed in 1.7.0 — out of scope; "event0" is never produced by valid configs.)
test("event_path_for('event0') — current quirky mapping is preserved", () => {
  assert.equal(event_path_for("event0"), "_experience.analytics.event101to200.event0")
})

test("coerce_events_into_xdm: string, explicit value, object and null-skip forms", () => {
  const log = make_logger()
  const xdm = {}
  coerce_events_into_xdm(xdm, ["event7", "event48=22", { event50: 3 }, null], {}, log)

  assert.deepEqual(xdm._experience.analytics.event1to100.event7, { value: 1 })
  assert.deepEqual(xdm._experience.analytics.event1to100.event48, { value: 22 })
  assert.deepEqual(xdm._experience.analytics.event1to100.event50, { value: 3 })
})

test("coerce_events_into_xdm warns on an unknown event", () => {
  const log = make_logger()
  coerce_events_into_xdm({}, ["event9999"], {}, log)
  assert.equal(log.calls.warning.length, 1)
})

test("coerce_kv_array_into_xdm: eVars are stringified, null item/value skipped", () => {
  const log = make_logger()
  const xdm = {}
  coerce_kv_array_into_xdm(
    xdm,
    [{ eVar4: 123 }, null, { eVar5: () => null }, { eVar6: () => "ok" }],
    "_experience.analytics.customDimensions.eVars",
    {},
    log
  )

  const eVars = xdm._experience.analytics.customDimensions.eVars
  assert.equal(eVars.eVar4, "123") // coerced to string
  assert.equal(eVars.eVar5, undefined) // null value skipped
  assert.equal(eVars.eVar6, "ok")
})

test("coerce_kv_array_into_xdm: lists keep non-string values", () => {
  const log = make_logger()
  const xdm = {}
  const list_val = { list: [{ value: "a" }, { value: "b" }] }
  coerce_kv_array_into_xdm(
    xdm,
    [{ list2: list_val }],
    "_experience.analytics.customDimensions.lists",
    {},
    log
  )

  assert.deepEqual(xdm._experience.analytics.customDimensions.lists.list2, list_val)
})
