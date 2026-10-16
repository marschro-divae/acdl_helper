/**
 * jentis — per-event log (src/plugins/jentis/lib/log.js): sender reports → shared logger lines.
 * The level decides the colour in the console (success green, warning orange, info plain); every line is only
 * printed in debug mode (`acdl_helper.setDebug(true)`) — that is the shared logger's job, not tested here.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { create_log } from "../src/plugins/jentis/lib/log.js"
import { make_logger } from "./helpers.js"

const CLICK = { event: "cmp:click", eventInfo: { path: "component.link-1" } }
const DOC = { track: "event", group: "link", name: "link_click", value: "Parking" }

function log(kind, details, options) {
  const logger = make_logger()
  create_log(logger, options)(kind, details)
  return logger.calls
}

test("forwarded event → success: event, path, group / name, and the document", () => {
  const calls = log("event", { event: CLICK, document: DOC, truncated: [] })
  assert.deepEqual(calls.success, [["cmp:click component.link-1 → link / link_click", DOC]])
})

test("forwarded event with truncated values names the keys", () => {
  const calls = log("event", { event: CLICK, document: DOC, truncated: ["value", "link_url"] })
  assert.equal(calls.success[0][0], "cmp:click component.link-1 → link / link_click (truncated: value, link_url)")
})

test("pageview → success with the page event and the document", () => {
  const document = { track: "pageview", pagetitle: "Tabs" }
  const calls = log("pageview", {
    event: { event: "acdl_helper:page:load", eventInfo: { path: "page.p-1" } },
    document,
    truncated: [],
  })
  assert.deepEqual(calls.success, [["pageview (acdl_helper:page:load page.p-1)", document]])
})

test("the reference wins over the path in the label (project events)", () => {
  const event = { event: "slider:navigate", eventInfo: { reference: "component.slider-1", path: "x" } }
  const calls = log("held", { event })
  assert.deepEqual(calls.info, [["slider:navigate component.slider-1 held until the pageview"]])
})

test("dropped → info with the reason; no matching rule lists why each rule did not apply", () => {
  assert.deepEqual(log("dropped", { event: CLICK, reason: "rule false" }).info, [
    ["cmp:click component.link-1 not forwarded: rule false"],
  ])
  assert.deepEqual(log("dropped", { event: CLICK, reason: "no matching rule", rules: ["match", "skip"] }).info, [
    ["cmp:click component.link-1 not forwarded: no matching rule (#0 match, #1 skip)"],
  ])
})

test("ignored → info; an event without eventInfo is labelled by its name", () => {
  assert.deepEqual(log("ignored", { event: { event: "cmp:loaded" } }).info, [["cmp:loaded ignored: not in events"]])
})

test("resolver problems → one warning each, with the property", () => {
  const calls = log("problems", {
    event: CLICK,
    problems: [
      { key: "link_url", message: "resolver threw: boom" },
      { key: "value", message: "not a string, number or boolean — omitted" },
    ],
  })
  assert.deepEqual(calls.warning, [
    ["cmp:click component.link-1 link_url: resolver threw: boom"],
    ["cmp:click component.link-1 value: not a string, number or boolean — omitted"],
  ])
})

test("enabled: false mutes every per-event line", () => {
  for (const [kind, details] of [
    ["event", { event: CLICK, document: DOC }],
    ["pageview", { event: CLICK, document: DOC }],
    ["dropped", { event: CLICK, reason: "no node" }],
    ["held", { event: CLICK }],
    ["ignored", { event: CLICK }],
    ["problems", { event: CLICK, problems: [{ key: "k", message: "m" }] }],
  ]) {
    const calls = log(kind, details, { enabled: false })
    assert.equal(
      calls.success.length + calls.info.length + calls.warning.length + calls.error.length,
      0,
      `${kind} muted`
    )
  }
})

test("the pageview timeout is a warning and is never muted", () => {
  for (const enabled of [true, false]) {
    const calls = log("timeout", { message: 'no "acdl_helper:page:load" within 5000 ms …' }, { enabled })
    assert.deepEqual(calls.warning, [['no "acdl_helper:page:load" within 5000 ms …']])
  }
})

test("unknown report kinds are ignored", () => {
  const calls = log("something-new", { event: CLICK })
  assert.equal(calls.success.length + calls.info.length + calls.warning.length + calls.error.length, 0)
})
