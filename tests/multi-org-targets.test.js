/**
 * Tests for multi-org sending — `plugins.xdmtracker.targets`.
 *
 * Adobe requires one Web SDK instance per Adobe Org (unique orgId AND unique
 * datastreamId each), so sending to n Orgs means sending to n named globals.
 * A "target" is a named destination = instance + its own defaults + its own options.
 *
 * The two levels of the interface:
 *   - TARGET config  — systematic differences, declared once (analytics/personalization
 *                      capabilities, useGlobalDefaults, own defaults, optIn, enabled)
 *   - EVENT `targets` — the only new event key: an overlay object (delta or, with
 *                      extends:false, a replacement) or `false` to exclude the target
 *
 * Single-instance behavior is locked separately in
 * tests/single-instance-characterization.test.js and must stay untouched.
 * Design: DOCS/FEATURES/xdmtracker-multi-org-targets/README.md
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import xdmtracker from "../src/plugins/xdmtracker/index.js"
import { make_logger, deferred } from "./helpers.js"

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Two Orgs: `aa` → window.alloy, `cja` → window.volkswagen. */
const TWO_TARGETS = {
  aa: { instance: "alloy", primary: true },
  cja: { instance: "volkswagen" },
}

/**
 * Build a provider with one recording stub per instance. `sent.alloy` /
 * `sent.volkswagen` collect the payloads each Org actually received.
 */
function setup(config, cmp = {}, alloy_impl) {
  const sent = { alloy: [], volkswagen: [] }
  const record = name => (cmd, payload) => {
    sent[name].push(payload)
    return alloy_impl ? alloy_impl(name, cmd, payload) : Promise.resolve({ propositions: [] })
  }
  global.window = { alloy: record("alloy"), volkswagen: record("volkswagen") }

  const logger = make_logger()
  let auto_handler = null
  const registered = []
  const context = {
    logger,
    config: config || {},
    acdl: {
      add_event_listener: (evt, handler, opts) => {
        registered.push({ evt, opts })
        auto_handler = handler
      },
      push: () => {},
      remove_event_listener: () => {},
    },
    catch: () => ({ get: () => cmp }),
  }
  const plugin = xdmtracker().impl(context)
  const api = plugin.provider
  const track = (name, send_opts) => api.track({ message: { event: name } }, send_opts)
  const emit = name => auto_handler && auto_handler({ event: name, eventInfo: {} })
  return { api, init: plugin.init, track, emit, sent, logger, registered }
}

/** Convenience: the eVars object of a payload (or undefined). */
const evars_of = payload =>
  payload.xdm._experience &&
  payload.xdm._experience.analytics &&
  payload.xdm._experience.analytics.customDimensions &&
  payload.xdm._experience.analytics.customDimensions.eVars

const warned = (logger, re) => logger.calls.warning.some(a => re.test(a.join(" ")))

// ── fan-out basics ──────────────────────────────────────────────────────────────

test("two targets → one event produces one sendEvent per instance", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "app:page": { pageView: true, events: ["event1"] } } })

  track("app:page")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 1)
  assert.deepEqual(sent.alloy[0].xdm.web.webPageDetails.pageViews, { value: 1 })
  assert.deepEqual(sent.volkswagen[0].xdm.web.webPageDetails.pageViews, { value: 1 })
})

test("track() returns a map keyed by target when targets are configured", () => {
  const { api, track } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("cmp:click")

  assert.deepEqual(Object.keys(returned), ["aa", "cja"])
  assert.ok(returned.aa.xdm && returned.cja.xdm)
})

test("instance name defaults to the target key", () => {
  const { api, track, sent } = setup({ targets: { alloy: {}, volkswagen: {} } })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 1)
})

test("primary target is sent first regardless of declaration order", () => {
  const order = []
  const { api, track } = setup(
    { targets: { cja: { instance: "volkswagen" }, aa: { instance: "alloy", primary: true } } },
    {},
    name => {
      order.push(name)
      return Promise.resolve({})
    }
  )
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.deepEqual(order, ["alloy", "volkswagen"])
})

// ── delta / replace ─────────────────────────────────────────────────────────────

test("delta: an overlay adds fields for one target and keeps the shared definition", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS }, { step: "3" })
  api.define({
    defaults: { eVars: [{ eVar1: () => "url" }] },
    events: {
      "app:page": {
        pageView: true,
        events: ["event1"],
        eVars: [{ eVar11: "app:page" }],
        targets: { cja: { xdm: { _tenant: { step: cmp => cmp.step } } } },
      },
    },
  })

  track("app:page")

  // shared definition intact in BOTH payloads
  assert.deepEqual(evars_of(sent.alloy[0]), { eVar1: "url", eVar11: "app:page" })
  assert.deepEqual(evars_of(sent.volkswagen[0]), { eVar1: "url", eVar11: "app:page" })
  // the delta only in the target that asked for it
  assert.deepEqual(sent.volkswagen[0].xdm._tenant, { step: "3" })
  assert.equal(sent.alloy[0].xdm._tenant, undefined)
})

test("delta works in both directions — an overlay on the primary target too", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS })
  api.define({
    events: {
      "cmp:click": {
        events: ["event2"],
        eVars: [{ eVar11: "cmp:click" }],
        targets: { aa: { eVars: [{ eVar50: "aa-only" }] } },
      },
    },
  })

  track("cmp:click")

  assert.deepEqual(evars_of(sent.alloy[0]), { eVar11: "cmp:click", eVar50: "aa-only" })
  assert.deepEqual(evars_of(sent.volkswagen[0]), { eVar11: "cmp:click" })
})

test("an overlay overrides the shared value for that target only", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS })
  api.define({
    events: {
      "cmp:click": {
        events: ["event2"],
        eVars: [{ eVar11: "shared" }],
        targets: { cja: { eVars: [{ eVar11: "cja-specific" }] } },
      },
    },
  })

  track("cmp:click")

  assert.equal(evars_of(sent.alloy[0]).eVar11, "shared")
  assert.equal(evars_of(sent.volkswagen[0]).eVar11, "cja-specific")
})

test("extends:false replaces the shared body — no AA variables from it survive", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS }, { model: "GTI" })
  api.define({
    events: {
      "cfg:complete": {
        events: ["event42"],
        eVars: [{ eVar11: "cfg:complete" }],
        targets: {
          cja: { extends: false, xdm: { _tenant: { model: cmp => cmp.model } } },
        },
      },
    },
  })

  track("cfg:complete")

  assert.deepEqual(evars_of(sent.alloy[0]), { eVar11: "cfg:complete" })
  assert.equal(sent.volkswagen[0].xdm._experience, undefined, "no AA block at all")
  assert.deepEqual(sent.volkswagen[0].xdm._tenant, { model: "GTI" })
  assert.equal(logger.calls.warning.length, 0, "no pageView to lose → no warning")
})

test("extends:false that drops pageView warns (a page view would become a link click)", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS })
  api.define({
    events: {
      "app:page": {
        pageView: true,
        targets: { cja: { extends: false, xdm: { _tenant: { a: 1 } } } },
      },
    },
  })

  track("app:page")

  assert.ok(sent.alloy[0].xdm.web.webPageDetails, "primary is still a page view")
  assert.ok(sent.volkswagen[0].xdm.web.webInteraction, "secondary fell back to link click")
  assert.ok(warned(logger, /extends:false.*pageView/), "the silent hit-type change is called out")
})

test("target defaults are layered beneath the event definition", () => {
  const { api, track, sent } = setup({
    targets: {
      aa: { instance: "alloy" },
      cja: { instance: "volkswagen", defaults: { xdm: { _tenant: { page: { name: () => "T" } } } } },
    },
  })
  api.define({ events: { "app:page": { pageView: true, xdm: { _tenant: { page: { type: "model" } } } } } })

  track("app:page")

  assert.deepEqual(sent.volkswagen[0].xdm._tenant.page, { name: "T", type: "model" })
  assert.deepEqual(sent.alloy[0].xdm._tenant.page, { type: "model" })
})

// ── routing ─────────────────────────────────────────────────────────────────────

test("targets: { key: false } → NO sendEvent call to that instance at all", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "search:error": { events: ["event2"], targets: { cja: false } } } })

  track("search:error")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 0, "not an empty payload — no call whatsoever")
})

test("an event excluded from every target sends nothing and returns an empty map", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "nowhere:go": { events: ["event2"], targets: { aa: false, cja: false } } } })

  const returned = track("nowhere:go")

  assert.equal(sent.alloy.length + sent.volkswagen.length, 0)
  assert.deepEqual(returned, {})
  assert.ok(logger.calls.info.some(a => String(a[0]).includes("No target receives")))
})

test("an overlay alone never changes routing — the event still reaches every target", () => {
  const { api, track, sent } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "app:page": { pageView: true, targets: { cja: { xdm: { _tenant: { a: 1 } } } } } } })

  track("app:page")

  assert.equal(sent.alloy.length, 1, "adding a CJA field must not switch off Adobe Analytics")
  assert.equal(sent.volkswagen.length, 1)
})

test("enabled:false is the hard kill switch — even an explicit overlay cannot revive it", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", enabled: false } },
  })
  api.define({ events: { "cmp:click": { events: ["event2"], targets: { cja: { eVars: [{ eVar1: "x" }] } } } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 0)
})

test("optIn:true — the target only receives events whose overlay names it", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", optIn: true } },
  })
  api.define({
    events: {
      "not:named": { events: ["event2"] },
      "is:named": { events: ["event3"], targets: { cja: {} } },
    },
  })

  track("not:named")
  assert.equal(sent.volkswagen.length, 0, "not named → not sent")
  assert.equal(sent.alloy.length, 1, "the opt-in target does not affect the others")

  track("is:named")
  assert.equal(sent.volkswagen.length, 1, "an empty {} overlay is enough to opt in")
})

test("an unknown target key warns once at definition load and is ignored", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "cmp:click": { events: ["event2"], targets: { typo: false } } } })

  assert.ok(warned(logger, /unknown target "typo"/))
  const before = logger.calls.warning.length
  track("cmp:click")
  track("cmp:click")
  assert.equal(logger.calls.warning.length, before, "not re-warned per track() call")
  assert.equal(sent.alloy.length, 2, "the bogus entry changes nothing")
  assert.equal(sent.volkswagen.length, 2)
})

test("a non-object, non-false overlay warns and is treated as absent (no silent drop)", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "cmp:click": { events: ["event2"], targets: { cja: null } } } })

  assert.ok(warned(logger, /must be an object or false/))
  track("cmp:click")
  assert.equal(sent.volkswagen.length, 1, "a null typo must never silently drop an Org")
})

// ── capabilities ────────────────────────────────────────────────────────────────

test("analytics:false keeps _experience.analytics out but keeps semantics and custom xdm", () => {
  const { api, track, sent } = setup({
    targets: {
      aa: { instance: "alloy" },
      cja: {
        instance: "volkswagen",
        analytics: false,
        defaults: { xdm: { _tenant: { page: { name: () => "T" } } } },
      },
    },
  })
  api.define({
    defaults: { eVars: [{ eVar1: () => "url" }] },
    events: {
      "app:page": {
        pageView: true,
        events: ["event1"],
        eVars: [{ eVar11: "app:page" }],
        targets: { cja: { xdm: { _tenant: { page: { type: "model" } } } } },
      },
    },
  })

  track("app:page")

  assert.deepEqual(evars_of(sent.alloy[0]), { eVar1: "url", eVar11: "app:page" })
  assert.equal(sent.volkswagen[0].xdm._experience, undefined, "no AA variables inherited")
  assert.deepEqual(sent.volkswagen[0].xdm.web.webPageDetails.pageViews, { value: 1 }, "semantics kept")
  assert.deepEqual(sent.volkswagen[0].xdm._tenant.page, { name: "T", type: "model" })
})

test("analytics:false filters only INHERITED layers — an explicit overlay eVar is honored", () => {
  const { api, track, sent, logger } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", analytics: false } },
  })
  api.define({
    events: {
      "cmp:click": {
        events: ["event2"],
        eVars: [{ eVar11: "inherited" }],
        targets: { cja: { eVars: [{ eVar60: "explicit" }] } },
      },
    },
  })

  track("cmp:click")

  assert.deepEqual(evars_of(sent.volkswagen[0]), { eVar60: "explicit" }, "explicit kept, inherited dropped")
  assert.ok(warned(logger, /analytics:false/), "but it is called out as unusual")
})

test("useGlobalDefaults:false keeps the global defaults out of that target", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", useGlobalDefaults: false } },
  })
  api.define({
    defaults: { eVars: [{ eVar1: () => "url" }] },
    events: { "cmp:click": { events: ["event2"], eVars: [{ eVar11: "x" }] } },
  })

  track("cmp:click")

  assert.deepEqual(evars_of(sent.alloy[0]), { eVar1: "url", eVar11: "x" })
  assert.deepEqual(evars_of(sent.volkswagen[0]), { eVar11: "x" })
})

test("personalization:false strips inherited renderDecisions/personalization", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", personalization: false } },
  })
  api.define({
    events: {
      "app:page": {
        pageView: true,
        renderDecisions: true,
        personalization: { includeRenderedPropositions: true },
      },
    },
  })

  track("app:page")

  assert.equal(sent.alloy[0].renderDecisions, true)
  assert.deepEqual(sent.alloy[0].personalization, { includeRenderedPropositions: true })
  assert.equal(sent.volkswagen[0].renderDecisions, false)
  assert.equal(sent.volkswagen[0].personalization, undefined)
})

test("personalization:false skips fetchOnly prefetches entirely", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", personalization: false } },
  })
  api.define({
    events: { "app:init": { fetchOnly: true, renderDecisions: true } },
  })

  track("app:init")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 0, "a propositionFetch to a non-personalization Org is noise")
})

test("an explicit overlay on a fetchOnly event overrides the personalization skip, with a warning", () => {
  const { api, track, sent, logger } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", personalization: false } },
  })
  api.define({
    events: {
      "app:init": { fetchOnly: true, renderDecisions: true, targets: { cja: { renderDecisions: true } } },
    },
  })

  track("app:init")

  assert.equal(sent.volkswagen.length, 1, "explicit beats implicit")
  assert.equal(sent.volkswagen[0].renderDecisions, true)
  assert.ok(warned(logger, /personalization:false/))
})

test("personalization:false also blocks call-level send_opts (the capability really holds)", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", personalization: false } },
  })
  api.define({ events: { "app:page": { pageView: true } } })

  // build_payload falls back to send_opts whenever the definition is silent — the
  // capability must not be bypassable that way.
  track("app:page", { renderDecisions: true, personalization: { includeRenderedPropositions: true } })

  assert.equal(sent.alloy[0].renderDecisions, true)
  assert.deepEqual(sent.alloy[0].personalization, { includeRenderedPropositions: true })
  assert.equal(sent.volkswagen[0].renderDecisions, false)
  assert.equal(sent.volkswagen[0].personalization, undefined)
})

test("target-level send options are transport-only — pageView cannot be set per target", () => {
  const { api, track, sent } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", pageView: true } },
  })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.ok(sent.volkswagen[0].xdm.web.webInteraction, "still a link click — target semantics are ignored")
  assert.equal(sent.volkswagen[0].xdm.web.webPageDetails, undefined)
})

test("target-level datastreamId is used, and the event definition still overrides it", () => {
  const { api, track, sent } = setup({
    targets: {
      aa: { instance: "alloy" },
      cja: { instance: "volkswagen", datastreamId: "ds-cja" },
    },
  })
  api.define({
    events: {
      "cmp:click": { events: ["event2"] },
      "other:click": { events: ["event3"], targets: { cja: { datastreamId: "ds-override" } } },
    },
  })

  track("cmp:click")
  track("other:click")

  assert.equal(sent.volkswagen[0].edgeConfigOverrides.datastreamId, "ds-cja")
  assert.equal(sent.volkswagen[1].edgeConfigOverrides.datastreamId, "ds-override")
  assert.equal(sent.alloy[0].edgeConfigOverrides, undefined, "other targets unaffected")
})

// ── render gate isolation ───────────────────────────────────────────────────────

test("render gates are per target — a pending render on one never gates the other", async () => {
  const render = deferred()
  const { api, track, sent } = setup({ targets: TWO_TARGETS }, {}, (name, cmd, payload) =>
    name === "alloy" && payload.renderDecisions === true ? render.promise : Promise.resolve({})
  )
  api.define({
    events: {
      // prefetch renders on the primary only
      "app:init": { fetchOnly: true, renderDecisions: true, targets: { cja: false } },
      "app:page": { pageView: true, personalization: { includeRenderedPropositions: true } },
    },
  })

  track("app:init")
  assert.equal(sent.alloy.length, 1)

  track("app:page")
  assert.equal(sent.alloy.length, 1, "the primary page view waits for the primary render")
  assert.equal(sent.volkswagen.length, 1, "the secondary is not held by an unrelated Org's render")

  render.resolve({})
  await sleep(0)
  assert.equal(sent.alloy.length, 2, "primary page view fires once its own render settles")
})

test("each target's gate is one-shot and independent", async () => {
  const renders = { alloy: deferred(), volkswagen: deferred() }
  const { api, track, sent } = setup({ targets: TWO_TARGETS }, {}, (name, cmd, payload) =>
    payload.renderDecisions === true ? renders[name].promise : Promise.resolve({})
  )
  api.define({
    events: {
      "app:init": { fetchOnly: true, renderDecisions: true },
      "app:page": { pageView: true, personalization: { includeRenderedPropositions: true } },
    },
  })

  track("app:init")
  track("app:page")
  assert.equal(sent.alloy.length, 1, "both page views held")
  assert.equal(sent.volkswagen.length, 1)

  renders.volkswagen.resolve({})
  await sleep(0)
  assert.equal(sent.volkswagen.length, 2, "released independently")
  assert.equal(sent.alloy.length, 1, "the other gate is untouched")

  renders.alloy.resolve({})
  await sleep(0)
  assert.equal(sent.alloy.length, 2)
})

// ── robustness ──────────────────────────────────────────────────────────────────

test("a missing instance errors for that target only — the others still send", () => {
  const { api, track, sent, logger } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "missing_global" } },
  })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1, "one broken instance must not break the working Org")
  assert.ok(logger.calls.error.some(a => a.join(" ").includes("missing_global")))
})

test("init() reports every missing instance, naming target key and global", () => {
  const { init, logger } = setup({ targets: { aa: { instance: "alloy" }, cja: { instance: "nope" } } })

  init()

  assert.equal(logger.calls.error.length, 1)
  const msg = logger.calls.error[0].join(" ")
  assert.match(msg, /nope/)
  assert.match(msg, /cja/)
})

test("two targets on the same instance warn about double-sending", () => {
  const { logger } = setup({ targets: { a: { instance: "alloy" }, b: { instance: "alloy" } } })

  assert.ok(warned(logger, /both use instance "alloy".*twice/))
})

test("a malformed targets config falls back to the single implicit alloy target", () => {
  const { api, track, sent, logger } = setup({ targets: "nonsense" })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.ok(returned.xdm, "legacy single-payload return shape")
  assert.ok(logger.calls.error.some(a => a.join(" ").includes("targets must be an object")))
})

test("a catch() that yields no component state resolves to an empty cmp, not a crash", () => {
  // event_catcher returns undefined for events it cannot resolve (e.g. no
  // eventInfo.path). Resolvers must then see {} rather than throwing.
  const sent = []
  global.window = { alloy: (cmd, payload) => (sent.push(payload), Promise.resolve({})) }
  const logger = make_logger()
  const context = {
    logger,
    config: {},
    catch: () => null, // nothing resolvable
  }
  const api = xdmtracker().impl(context).provider
  api.define({ events: { "cmp:click": { eVars: [{ eVar1: cmp => cmp.missing }] } } })

  api.track({ message: { event: "cmp:click" } })

  assert.equal(sent.length, 1)
  assert.equal(logger.calls.error.length, 0, "an unresolvable cmp is not an error")
  // build_xdm ensure()s the AA container whenever def.eVars exists, so the container is
  // present but EMPTY — the undefined resolver value is skipped, not written as null.
  assert.deepEqual(sent[0].xdm._experience.analytics.customDimensions.eVars, {})
})

// ── malformed configuration (defensive branches) ────────────────────────────────

test("targets: {} (empty) falls back to the single implicit alloy target", () => {
  const { api, track, sent, logger } = setup({ targets: {} })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.ok(returned.xdm, "legacy single-payload return shape")
  assert.ok(warned(logger, /targets is empty/))
})

test("a non-object target value is skipped with an error — the others keep working", () => {
  const { api, track, sent, logger } = setup({
    targets: { aa: { instance: "alloy" }, cja: "volkswagen" },
  })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 0)
  assert.ok(logger.calls.error.some(a => a.join(" ").includes('target "cja" must be an object')))
})

test("an invalid instance type is skipped with an error", () => {
  const { api, track, sent, logger } = setup({
    targets: { aa: { instance: "alloy" }, cja: { instance: "" } },
  })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1)
  assert.ok(logger.calls.error.some(a => a.join(" ").includes("instance must be a non-empty string")))
})

test("when no declared target is usable, it falls back to the implicit alloy target", () => {
  const { api, track, sent, logger } = setup({ targets: { broken: 42 } })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  const returned = track("cmp:click")

  assert.equal(sent.alloy.length, 1, "tracking still works rather than going silent")
  assert.ok(returned.xdm, "and behaves as the legacy single target")
  assert.ok(logger.calls.error.some(a => a.join(" ").includes("no usable target")))
})

test("a throwing instance is caught per target — the other target still sends", () => {
  const { api, track, sent, logger } = setup({ targets: TWO_TARGETS }, {}, name => {
    if (name === "volkswagen") throw new Error("alloy not configured")
    return Promise.resolve({})
  })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  track("cmp:click")

  assert.equal(sent.alloy.length, 1, "one Org's broken SDK must not take down the other")
  assert.ok(logger.calls.error.some(a => a.join(" ").includes("sendEvent failed")))
})

test("an event without a resolvable name errors and sends nothing to any target", () => {
  const { api, sent, logger } = setup({ targets: TWO_TARGETS })
  api.define({ events: { "cmp:click": { events: ["event2"] } } })

  api.track({ message: {} })

  assert.equal(sent.alloy.length + sent.volkswagen.length, 0)
  assert.ok(logger.calls.error.some(a => String(a[0]).includes("Cannot resolve event name")))
})

test("autoTrack: one listener fans out to every target", async () => {
  const { sent, registered, emit } = setup({
    autoTrack: true,
    targets: TWO_TARGETS,
    events: { "app:page": { pageView: true, events: ["event1"] } },
  })
  await sleep(0) // registration is deferred to a post-init macrotask

  assert.equal(registered.length, 1, "still exactly one listener")
  assert.equal(sent.alloy.length + sent.volkswagen.length, 0, "nothing emitted yet")

  emit("app:page")

  assert.equal(sent.alloy.length, 1)
  assert.equal(sent.volkswagen.length, 1)
})
