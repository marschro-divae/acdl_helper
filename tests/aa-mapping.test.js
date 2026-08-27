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

// "event0" matches /^event(\d+)$/ but is not a valid Adobe Analytics event. Until 1.10.0
// it resolved to event101to200.event0: the lower bound lived inside the first bucket check
// ("n >= 1 && n <= 100"), so for n = 0 that check failed and the n <= 200 bucket matched.
test("event_path_for rejects event0 and any other sub-1 index", () => {
  assert.equal(event_path_for("event0"), null)
  assert.equal(event_path_for("event00"), null)
})

test("coerce_events_into_xdm warns on event0 instead of misfiling it", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, ["event0", { event0: 5 }, "event1"], {}, logger)

  assert.deepEqual(xdm, { _experience: { analytics: { event1to100: { event1: { value: 1 } } } } })
  assert.equal(logger.calls.warning.length, 2, "both forms warn")
  assert.ok(logger.calls.warning.every(a => String(a[0]).includes("unknown event")))
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

test("coerce_events_into_xdm warns on an unknown key in the OBJECT form", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, [{ event1: 1, notanevent: 2, event1001: 3 }], {}, logger)

  assert.deepEqual(xdm, { _experience: { analytics: { event1to100: { event1: { value: 1 } } } } })
  assert.equal(logger.calls.warning.length, 2, "both bad keys warn, the valid one still maps")
  assert.ok(logger.calls.warning.every(a => String(a[0]).includes("unknown event")))
})

test("coerce_events_into_xdm warns on an unsupported event descriptor", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, [42, true, ["event1"]], {}, logger)

  assert.deepEqual(xdm, {}, "nothing is mapped")
  assert.equal(logger.calls.warning.length, 3)
  assert.ok(logger.calls.warning.every(a => String(a[0]).includes("unsupported event descriptor")))
})

test("coerce_events_into_xdm: a resolver returning an unknown name warns", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, [() => "nope", () => ({ alsonope: 1 })], {}, logger)

  assert.deepEqual(xdm, {})
  assert.equal(logger.calls.warning.length, 2)
})

test("coerce_kv_array_into_xdm warns on a non-object item", () => {
  const xdm = {},
    logger = make_logger()
  coerce_kv_array_into_xdm(
    xdm,
    ["notanobject", 42, { eVar1: "kept" }],
    "_experience.analytics.customDimensions.eVars",
    {},
    logger
  )

  assert.deepEqual(xdm._experience.analytics.customDimensions.eVars, { eVar1: "kept" })
  assert.equal(logger.calls.warning.length, 2)
  assert.ok(logger.calls.warning.every(a => String(a[0]).includes("bad kv item")))
})

test("event_path_for covers every 100-bucket and its boundaries", () => {
  // A typo in any bucket string would silently misfile events into the wrong AA
  // variable, so every bucket is asserted explicitly.
  const cases = [
    [1, "event1to100"], [100, "event1to100"],
    [101, "event101to200"], [200, "event101to200"],
    [201, "event201to300"], [300, "event201to300"],
    [301, "event301to400"], [400, "event301to400"],
    [401, "event401to500"], [500, "event401to500"],
    [501, "event501to600"], [600, "event501to600"],
    [601, "event601to700"], [700, "event601to700"],
    [701, "event701to800"], [800, "event701to800"],
    [801, "event801to900"], [900, "event801to900"],
    [901, "event901to1000"], [1000, "event901to1000"],
  ]
  for (const [n, bucket] of cases) {
    assert.equal(
      event_path_for("event" + n),
      `_experience.analytics.${bucket}.event${n}`,
      `event${n} must map to ${bucket}`
    )
  }
  assert.equal(event_path_for("event1001"), null, "out of range")
})

test("a non-numeric or empty explicit event value falls back to 1", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, ["event48=abc", "event49=", "event50= ", "event51"], {}, logger)

  // "abc" → NaN → fallback. "" and " " mean "no value given" → 1, exactly like the bare
  // "event51" form. (Before 1.10.0 the empty form counted 0: Number("") is 0, which IS
  // finite, so to_number_or() never reached its fallback.)
  assert.deepEqual(xdm._experience.analytics.event1to100, {
    event48: { value: 1 },
    event49: { value: 1 },
    event50: { value: 1 },
    event51: { value: 1 },
  })
})

test("an EXPLICIT zero is preserved — it is not treated as a missing value", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, ["event48=0", { event49: 0 }], {}, logger)

  // Both forms keep an explicit 0. Only an ABSENT value (bare "event51", or the empty
  // "event49=" form, or a resolver returning null) falls back to 1.
  assert.deepEqual(xdm._experience.analytics.event1to100, {
    event48: { value: 0 },
    event49: { value: 0 },
  })
})

test("an object-form event resolving to null still counts as 1", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, [{ event48: () => null }, { event49: undefined }], {}, logger)

  assert.deepEqual(xdm._experience.analytics.event1to100, {
    event48: { value: 1 },
    event49: { value: 1 },
  })
})

test("coerce_* are no-ops when not given an array", () => {
  const xdm = {},
    logger = make_logger()
  coerce_events_into_xdm(xdm, "event1", {}, logger)
  coerce_events_into_xdm(xdm, undefined, {}, logger)
  coerce_kv_array_into_xdm(xdm, { eVar1: "x" }, "_experience.analytics.customDimensions.eVars", {}, logger)

  assert.deepEqual(xdm, {}, "nothing mapped, nothing thrown")
  assert.equal(logger.calls.warning.length, 0)
})
