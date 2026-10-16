/**
 * jentis — config validation (src/plugins/jentis/lib/validate.js) and its reporting in init().
 * One test per check: a valid config yields no problem; each mistake yields exactly one problem with its path.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { validate_config } from "../src/plugins/jentis/lib/validate.js"
import jentis from "../src/plugins/jentis/index.js"
import { make_logger } from "./helpers.js"

const fn = () => "x"

// The configuration example of the feature doc (§4), complete.
const VALID = {
  partner_hosts: ["https://map.example.com", "shop.example.com"],
  families: [
    ["*/contentTeaser/*", "teaser"],
    ["*/text/*", "rich_text"],
  ],
  // limits of the project's destination (example values) — project configuration, not plugin defaults
  options: {
    max_value_length: 100,
    max_lengths: { pagetitle: 300, page_location: 1000 },
    max_name_length: 40,
    max_props: 25,
    log: true,
  },
  pageview: { on: "acdl_helper:page:load", props: { pagetitle: (page) => page["dc:title"], page_type: fn } },
  defaults: { props: { page_name: fn } },
  events: {
    "cmp:click": [
      {
        match: { "@type": "*/downloadlist/file" },
        group: "download_list",
        name: "file_download",
        props: { link_url: fn, file_type: fn },
      },
      {
        match: { "@type": "*/link" },
        group: fn,
        name: "link_click",
        value: fn,
        props: { link_url: fn, link_type: fn },
      },
    ],
    "cmp:show": [{ match: { "@type": "*/tabs/item" }, skip: fn, group: "tabs", name: "tab_select", value: fn }],
    "cmp:hide": false,
    "slider:navigate": { group: "slider", name: "slider_navigate", value: fn, props: { slide_position: fn } },
    "notification:shown": { group: "notification", name: "notification_shown", interactive: false, numvalue: 1 },
  },
}

function only_problem(config, level, path) {
  const { problems } = validate_config(config)
  assert.equal(problems.length, 1, `exactly one problem, got ${JSON.stringify(problems)}`)
  assert.equal(problems[0].level, level)
  assert.equal(problems[0].path, path)
  return validate_config(config).config
}

// ---------- valid configuration ----------

test("the feature doc's example config is valid — no problems", () => {
  assert.deepEqual(validate_config(VALID).problems, [])
})

test("valid config is normalised: single rule → array, false kept, defaults filled", () => {
  const { config } = validate_config(VALID)
  assert.equal(config.events["cmp:hide"], false)
  assert.equal(config.events["slider:navigate"].length, 1)
  assert.equal(config.events["cmp:click"].length, 2)
  assert.equal(config.options.pageview_timeout, 5000, "default")
  assert.deepEqual(config.options.max_lengths, { pagetitle: 300, page_location: 1000 })
})

test("normalised config is deeply frozen (resolver functions untouched)", () => {
  const { config } = validate_config(VALID)
  assert.ok(Object.isFrozen(config) && Object.isFrozen(config.events) && Object.isFrozen(config.events["cmp:click"][0]))
  assert.equal(typeof config.events["cmp:click"][1].group, "function")
})

test("empty config → defaults, one warning: no events", () => {
  const config = only_problem({}, "warning", "events")
  assert.deepEqual(config.pageview, { on: "acdl_helper:page:load", props: {} })
  assert.deepEqual(config.options, {
    max_value_length: null,
    max_lengths: {},
    max_name_length: null,
    max_props: null,
    log: true,
    pageview_timeout: 5000,
  })
})

test("no destination limits by default: long names and many props are fine", () => {
  const props = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`property_with_a_rather_long_name_${i}`, "x"]))
  const { problems, config } = validate_config({ events: { e: { group: "g", name: "n".repeat(80), props } } })
  assert.deepEqual(problems, [])
  assert.equal(Object.keys(config.events.e[0].props).length, 60)
})

test("custom global prefix sets the default pageview event", () => {
  const { config } = validate_config({ events: {} }, { global_prefix: "dlh" })
  assert.equal(config.pageview.on, "dlh:page:load")
})

// ---------- top level ----------

test("config not an object → error, defaults", () => {
  const { problems } = validate_config("nope")
  assert.ok(problems.some((p) => p.level === "error" && p.path === "jentis"))
})

test("unknown top-level key → warning", () => {
  only_problem({ events: {}, evnts: {} }, "warning", "evnts")
})

test("events not an object → error", () => {
  only_problem({ events: [] }, "error", "events")
})

test("event entry neither rule, array nor false → error, ignored", () => {
  const config = only_problem({ events: { "cmp:click": "link" } }, "error", "events['cmp:click']")
  assert.equal(config.events["cmp:click"], undefined)
})

// ---------- rules ----------

const rule = (r) => ({ events: { "cmp:click": [r] } })
const skipped = (config) => assert.equal(config.events["cmp:click"].length, 0, "rule skipped")

test("rule not an object → error, skipped", () => {
  skipped(only_problem(rule("x"), "error", "events['cmp:click'][0]"))
})

test("missing group → error, rule skipped", () => {
  skipped(only_problem(rule({ name: "link_click" }), "error", "events['cmp:click'][0].group"))
})

test("empty name → error, rule skipped", () => {
  skipped(only_problem(rule({ group: "g", name: " " }), "error", "events['cmp:click'][0].name"))
})

const limited = (config, options) => ({ ...config, options })

test("name over options.max_name_length → error, rule skipped", () => {
  const config = limited(rule({ group: "g", name: "x".repeat(41) }), { max_name_length: 40 })
  skipped(only_problem(config, "error", "events['cmp:click'][0].name"))
})

test("name at options.max_name_length → fine", () => {
  const config = limited(rule({ group: "g", name: "x".repeat(40) }), { max_name_length: 40 })
  assert.deepEqual(validate_config(config).problems, [])
})

test("match not an object of string patterns → error, rule skipped", () => {
  skipped(only_problem(rule({ group: "g", name: "n", match: { "@type": 5 } }), "error", "events['cmp:click'][0].match"))
})

test("skip not a function → error, rule skipped", () => {
  skipped(only_problem(rule({ group: "g", name: "n", skip: true }), "error", "events['cmp:click'][0].skip"))
})

test("value an object → error, rule skipped", () => {
  skipped(only_problem(rule({ group: "g", name: "n", value: { a: 1 } }), "error", "events['cmp:click'][0].value"))
})

test("interactive not boolean / function → error, rule skipped", () => {
  skipped(
    only_problem(rule({ group: "g", name: "n", interactive: "no" }), "error", "events['cmp:click'][0].interactive")
  )
})

test("numvalue not a number / function → error, rule skipped", () => {
  skipped(only_problem(rule({ group: "g", name: "n", numvalue: "3" }), "error", "events['cmp:click'][0].numvalue"))
})

test("unknown rule key (typo) → warning, rule kept", () => {
  const config = only_problem(rule({ group: "g", name: "n", prop: {} }), "warning", "events['cmp:click'][0].prop")
  assert.equal(config.events["cmp:click"].length, 1)
})

test("one invalid rule in an array does not affect the others", () => {
  const { config, problems } = validate_config({ events: { "cmp:click": [{ name: "n" }, { group: "g", name: "n" }] } })
  assert.equal(problems.length, 1)
  assert.equal(config.events["cmp:click"].length, 1)
  assert.equal(config.events["cmp:click"][0].group, "g")
})

// ---------- properties ----------

const with_props = (props) => rule({ group: "g", name: "n", props })
const props_of = (config) => config.events["cmp:click"][0].props

for (const reserved of ["track", "type", "group", "name", "value", "interactive", "numvalue"]) {
  test(`reserved property "${reserved}" → error, property dropped, rule kept`, () => {
    const config = only_problem(
      with_props({ [reserved]: "x", ok: "y" }),
      "error",
      `events['cmp:click'][0].props.${reserved}`
    )
    assert.deepEqual(Object.keys(props_of(config)), ["ok"])
  })
}

test("property name over options.max_name_length → error, dropped", () => {
  const long = "p".repeat(41)
  const config = only_problem(
    limited(with_props({ [long]: "x" }), { max_name_length: 40 }),
    "error",
    `events['cmp:click'][0].props.${long}`
  )
  assert.deepEqual(props_of(config), {})
})

test("non-scalar static property → error, dropped (flat documents only)", () => {
  const config = only_problem(with_props({ nested: { a: 1 } }), "error", "events['cmp:click'][0].props.nested")
  assert.deepEqual(props_of(config), {})
})

test("props not an object → error", () => {
  only_problem(with_props([]), "error", "events['cmp:click'][0].props")
})

test("more fields than options.max_props (incl. defaults) → warning, rule kept", () => {
  const props = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`p${i}`, "x"]))
  const defaults = { props: Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`d${i}`, "x"])) }
  // 3 (group, name, value) + 20 + 3 = 26
  const config = only_problem(
    { defaults, options: { max_props: 25 }, events: { "cmp:click": [{ group: "g", name: "n", props }] } },
    "warning",
    "events['cmp:click'][0]"
  )
  assert.equal(config.events["cmp:click"].length, 1)
})

test("exactly options.max_props fields → no warning", () => {
  const props = Object.fromEntries(Array.from({ length: 22 }, (_, i) => [`p${i}`, "x"]))
  const config = { options: { max_props: 25 }, events: { e: { group: "g", name: "n", props } } }
  assert.deepEqual(validate_config(config).problems, [])
})

test("interactive / numvalue count towards options.max_props", () => {
  const props = Object.fromEntries(Array.from({ length: 22 }, (_, i) => [`p${i}`, "x"]))
  const config = { options: { max_props: 25 }, events: { e: { group: "g", name: "n", interactive: false, props } } }
  assert.equal(validate_config(config).problems.length, 1, "3 + 1 + 22 = 26")
})

// ---------- pageview, defaults ----------

test("pageview false → kept (pageview sent elsewhere)", () => {
  assert.equal(validate_config({ pageview: false, events: {} }).config.pageview, false)
})

test("pageview not an object → error, default used", () => {
  const config = only_problem({ pageview: "yes", events: {} }, "error", "pageview")
  assert.equal(config.pageview.on, "acdl_helper:page:load")
})

test("pageview.on not a string → error, default used", () => {
  only_problem({ pageview: { on: 5 }, events: {} }, "error", "pageview.on")
})

test("pageview.on without the global prefix → warning, value kept", () => {
  const config = only_problem({ pageview: { on: "page:ready" }, events: {} }, "warning", "pageview.on")
  assert.equal(config.pageview.on, "page:ready")
})

test("pageview.props with a reserved name → error, dropped", () => {
  only_problem({ pageview: { props: { track: "x" } }, events: {} }, "error", "pageview.props.track")
})

test("unknown pageview key → warning", () => {
  only_problem({ pageview: { event: "x" }, events: {} }, "warning", "pageview.event")
})

test("defaults not an object → error", () => {
  only_problem({ defaults: [], events: {} }, "error", "defaults")
})

test("unknown defaults key → warning", () => {
  only_problem({ defaults: { prop: {} }, events: {} }, "warning", "defaults.prop")
})

// ---------- options, partner_hosts, families ----------

test("options not an object → error", () => {
  only_problem({ options: 5, events: {} }, "error", "options")
})

test("unknown option → warning", () => {
  only_problem({ options: { debug: true }, events: {} }, "warning", "options.debug")
})

for (const key of ["max_value_length", "max_name_length", "max_props"]) {
  test(`${key} not a positive integer → error, no limit`, () => {
    const config = only_problem({ options: { [key]: 0 }, events: {} }, "error", `options.${key}`)
    assert.equal(config.options[key], null)
  })
}

test("pageview_timeout not a positive integer → error, default 5000", () => {
  only_problem({ options: { pageview_timeout: -1 }, events: {} }, "error", "options.pageview_timeout")
})

test("log not a boolean → error, default true", () => {
  const config = only_problem({ options: { log: "no" }, events: {} }, "error", "options.log")
  assert.equal(config.options.log, true)
})

test("max_lengths not an object → error", () => {
  only_problem({ options: { max_lengths: 300 }, events: {} }, "error", "options.max_lengths")
})

test("max_lengths entry not a positive integer → error, ignored", () => {
  const config = only_problem(
    { options: { max_lengths: { a: 10, b: "x" } }, events: {} },
    "error",
    "options.max_lengths.b"
  )
  assert.deepEqual(config.options.max_lengths, { a: 10 })
})

test("partner_hosts not an array → error, []", () => {
  const config = only_problem({ partner_hosts: "x.example.com", events: {} }, "error", "partner_hosts")
  assert.deepEqual(config.partner_hosts, [])
})

test("partner_hosts entry not a non-empty string → warning, ignored", () => {
  const config = only_problem({ partner_hosts: ["a.example.com", ""], events: {} }, "warning", "partner_hosts[1]")
  assert.deepEqual(config.partner_hosts, ["a.example.com"])
})

test("families not an array → error, []", () => {
  only_problem({ families: {}, events: {} }, "error", "families")
})

test("families entry not a [pattern, family] pair → error, ignored", () => {
  const config = only_problem({ families: [["*/a/*", "a"], ["*/b/*"]], events: {} }, "error", "families[1]")
  assert.deepEqual(config.families, [["*/a/*", "a"]])
})

// ---------- reporting in init() ----------

// init() also subscribes and starts the pageview timer: a stub data layer API, timers mocked per test.
function init_context(t, logger, config, event_prefix = "acdl_helper:jentis") {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  return { logger, config, event_prefix, acdl: { subscribe: () => () => {} }, helpers: {} }
}

function init_with(t, config) {
  const logger = make_logger()
  const plugin = jentis()
  const impl = plugin.impl(init_context(t, logger, config))
  impl.init()
  return logger
}

test("init() with a valid config logs nothing", (t) => {
  const logger = init_with(t, VALID)
  assert.equal(logger.calls.error.length + logger.calls.warning.length, 0)
})

test("init() reports errors as errors and warnings as warnings, with the path", (t) => {
  const logger = init_with(t, { evnts: {}, events: { "cmp:click": [{ name: "n" }] } })
  assert.equal(logger.calls.error.length, 1)
  assert.match(logger.calls.error[0][0], /config events\['cmp:click'\]\[0\]\.group/)
  assert.equal(logger.calls.warning.length, 1)
  assert.match(logger.calls.warning[0][0], /config evnts/)
})

test("init() reports problems even with options.log false (log mutes only the per-event log)", (t) => {
  const logger = init_with(t, { options: { log: false }, events: { "cmp:click": [{ name: "n" }] } })
  assert.equal(logger.calls.error.length, 1)
})

test("init() uses the global prefix from the plugin's event_prefix for the default pageview", (t) => {
  const logger = make_logger()
  const impl = jentis().impl(init_context(t, logger, { pageview: { on: "dlh:page:load" }, events: {} }, "dlh:jentis"))
  impl.init()
  assert.equal(logger.calls.warning.length, 0, "dlh:page:load matches the global prefix dlh")
})

test("plugin meta: name jentis, no core-registered events", () => {
  const plugin = jentis()
  assert.equal(plugin.meta.name, "jentis")
  assert.deepEqual(plugin.meta.events, [])
  assert.ok(Object.isFrozen(plugin.meta))
})
