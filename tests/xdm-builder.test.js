/**
 * Characterization tests for build_xdm — confirms it maps AA variables / custom
 * XDM only, and (importantly) never injects web.webPageDetails or web.webInteraction
 * (those are the SDK's / payload.js's responsibility).
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { build_xdm } from "../src/plugins/xdmtracker/lib/xdm-builder.js"
import { make_logger } from "./helpers.js"

test("eVars / props / lists map under _experience.analytics.customDimensions", () => {
  const log = make_logger()
  const xdm = build_xdm(
    {
      eVars: [{ eVar4: () => "de" }],
      props: [{ prop10: "page-id" }],
      lists: [{ list2: { list: [{ value: "tag" }] } }],
    },
    {},
    log
  )

  const cd = xdm._experience.analytics.customDimensions
  assert.equal(cd.eVars.eVar4, "de")
  assert.equal(cd.props.prop10, "page-id")
  assert.deepEqual(cd.lists.list2, { list: [{ value: "tag" }] })
})

test("build_xdm never creates a web node", () => {
  const log = make_logger()
  const xdm = build_xdm({ eVars: [{ eVar1: "x" }], events: ["event7"] }, {}, log)
  assert.equal(xdm.web, undefined)
})

test("custom xdm object is deep-merged with function resolution", () => {
  const log = make_logger()
  const xdm = build_xdm({ xdm: { marketing: { trackingCode: () => "cid-42" } } }, {}, log)
  assert.equal(xdm.marketing.trackingCode, "cid-42")
})

test("xdmPairs set deep paths", () => {
  const log = make_logger()
  const xdm = build_xdm({ xdmPairs: [["a.b[0].c", "v"]] }, {}, log)
  assert.equal(xdm.a.b[0].c, "v")
})

test("an optional base xdm is layered upon (defaults → event)", () => {
  const log = make_logger()
  const base = build_xdm({ eVars: [{ eVar1: "base" }] }, {}, log)
  const xdm = build_xdm({ eVars: [{ eVar2: "evt" }] }, {}, log, base)

  assert.equal(xdm._experience.analytics.customDimensions.eVars.eVar1, "base")
  assert.equal(xdm._experience.analytics.customDimensions.eVars.eVar2, "evt")
})

test("a malformed xdm pair warns and is skipped, valid pairs still applied", () => {
  const logger = make_logger()
  const xdm = build_xdm(
    { xdmPairs: [["a.b", 1], ["only-one-element"], "notanarray", [], ["c.d", 2]] },
    {},
    logger
  )

  assert.deepEqual(xdm, { a: { b: 1 }, c: { d: 2 } })
  assert.equal(logger.calls.warning.length, 3)
  assert.ok(logger.calls.warning.every(a => String(a[0]).includes("bad xdm pair")))
})

test("a non-object xdm and a non-array xdmPairs are ignored, not thrown on", () => {
  const logger = make_logger()
  const xdm = build_xdm({ xdm: "notanobject", xdmPairs: "notanarray" }, {}, logger)

  assert.deepEqual(xdm, {})
  assert.equal(logger.calls.warning.length, 0)
})
