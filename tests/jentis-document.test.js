/**
 * jentis — snapshot and document building (src/plugins/jentis/lib/document.js), end to end from recorded
 * data layer sequences: validate_config → history cursor → take_snapshot → build_*_document.
 * Sequence shapes are copied from real AEM pages (Fraport sample site, ACDL 2.0.2).
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { validate_config } from "../src/plugins/jentis/lib/validate.js"
import { create_history_cursor } from "../src/plugins/jentis/lib/history.js"
import {
  take_snapshot,
  build_event_document,
  build_pageview_document,
  page_node,
} from "../src/plugins/jentis/lib/document.js"
import { matches } from "../src/core/lib/match.js"
import { link_type, family } from "../src/core/lib/link.js"
import { resolve_node } from "../src/core/lib/resolve_node.js"

const CORE = { matches, link_type, family, resolve_node }
const PAGE = { "page.contentPage-1": undefined }

const PAGE_SEED = {
  page: {
    "contentPage-4675": {
      "@type": "site/components/content/page/contentPage",
      "dc:title": "Tabs",
      "xdm:language": "en",
      "dlh:pagename": "components:tabs",
      "dlh:pagetype": "ContentPage",
    },
  },
}

const CONFIG = {
  partner_hosts: ["https://map.frankfurt-airport.com"],
  families: [["*/contentTeaser/*", "teaser"]],
  options: { max_value_length: 100, max_lengths: { link_url: 200 } },
  pageview: { props: { pagetitle: (page) => page["dc:title"], page_type: (page) => page["dlh:pagetype"] } },
  defaults: { props: { page_name: (cmp, h) => h.page()?.["dlh:pagename"] } },
  events: {
    "cmp:click": [
      {
        match: { "@type": "*/downloadlist/file" },
        group: "download_list",
        name: "file_download",
        props: { file_type: (c) => c.fileType },
      },
      {
        match: { "@type": "*/link" },
        group: (c, h) => h.family(c),
        name: "link_click",
        props: {
          link_url: (c) => c["xdm:linkURL"],
          link_type: (c, h) => h.link_type(c["xdm:linkURL"]),
          component_type: (c) => c["@type"],
        },
      },
    ],
    "cmp:show": [
      { match: { "@type": "*/tabs/item" }, skip: (c, h) => h.already_shown(c), group: "tabs", name: "tab_select" },
    ],
    "cmp:hide": false,
    "slider:navigate": {
      group: "slider",
      name: "slider_navigate",
      value: (c) => c.trigger,
      props: { slide_position: (c) => c.slidePosition, slide_count: (c) => c.slideCount },
    },
  },
}

/** Run a recorded sequence: every event item through cursor → snapshot → document. */
function run(items, config_input = CONFIG) {
  const { config, problems } = validate_config(config_input)
  assert.deepEqual(problems, [], "the test config itself is valid")
  const cursor = create_history_cursor(() => items)
  const final_state = items.reduce((s, item) => ({ ...s, ...(item && !item.event ? item : {}) }), {})
  const context = { core: CORE, get_page: () => page_node(final_state) }
  return items
    .filter((item) => item && item.event)
    .map((item) => {
      const event = { event: item.event, eventInfo: item.eventInfo }
      const snapshot = take_snapshot(event, cursor.state_at(event), CORE)
      return { event: item.event, ...build_event_document(snapshot, config, context) }
    })
}

// ---------- link click (Core collector) ----------

test("cmp:click on a seeded teaser link → link_click with resolved fields, family and link type", () => {
  const [result] = run([
    PAGE_SEED,
    {
      component: {
        "contentTeaserItem-d1e0": {
          "@type": "site/components/rebrush/content/contentTeaser/contentTeaserItem/link",
          "dc:title": "Link External",
          "xdm:linkURL": "https://map.frankfurt-airport.com/t1",
          "parentId": "contentTeaser-79c1",
        },
      },
    },
    { event: "cmp:click", eventInfo: { path: "component.contentTeaserItem-d1e0" } },
  ])
  assert.deepEqual(result.document, {
    page_name: "components:tabs",
    link_url: "https://map.frankfurt-airport.com/t1",
    link_type: "partner",
    component_type: "site/components/rebrush/content/contentTeaser/contentTeaserItem/link",
    track: "event",
    group: "teaser",
    name: "link_click",
    value: "Link External",
  })
})

test("first matching rule wins: a download is a file_download, not a link_click", () => {
  const [result] = run([
    {
      component: {
        "downloadlist-c07-file-1": {
          "@type": "site/components/rebrush/content/downloadlist/file",
          "dc:title": "Map",
          "fileType": "pdf",
        },
      },
    },
    { event: "cmp:click", eventInfo: { path: "component.downloadlist-c07-file-1" } },
  ])
  assert.equal(result.document.name, "file_download")
  assert.equal(result.document.file_type, "pdf")
  assert.equal(result.rule_index, 0)
})

test("click on a node no rule matches → dropped: no matching rule", () => {
  const [result] = run([
    { component: { "x-1": { "@type": "site/components/other" } } },
    { event: "cmp:click", eventInfo: { path: "component.x-1" } },
  ])
  assert.equal(result.dropped, "no matching rule")
  assert.deepEqual(result.rules, ["match", "match"], "why each rule did not apply")
})

test("click on an unknown node → dropped: no node", () => {
  const [result] = run([{ event: "cmp:click", eventInfo: { path: "component.missing" } }])
  assert.equal(result.dropped, "no node")
})

// ---------- our data layer service: slider:navigate (reference + own fields) ----------

test("slider:navigate (eventInfo.reference, fields pushed with the event) → slider_navigate", () => {
  const [result] = run([
    {
      component: {
        "sliderTeaser-1a2b": { "@type": "site/components/rebrush/content/sliderTeaser", "dc:title": "Inspiration" },
      },
    },
    {
      event: "slider:navigate",
      eventInfo: { reference: "component.sliderTeaser-1a2b" },
      component: { "sliderTeaser-1a2b": { timestamp: 1, trigger: "next", slidePosition: 2, slideCount: 4 } },
    },
  ])
  assert.equal(result.document.value, "next")
  assert.equal(result.document.slide_position, 2)
  assert.equal(result.document.slide_count, 4)
})

// ---------- Core tabs ----------

const TABS_SEED = {
  component: {
    "tabs-15b7": { "@type": "site/components/rebrush/content/tabs", "shownItems": ["tabs-15b7-item-a"] },
    "tabs-15b7-item-a": {
      "@type": "site/components/rebrush/content/tabs/item",
      "dc:title": "Coupons",
      "parentId": "tabs-15b7",
    },
    "tabs-15b7-item-b": {
      "@type": "site/components/rebrush/content/tabs/item",
      "dc:title": "Einkäufe",
      "parentId": "tabs-15b7",
    },
  },
}
const switch_to = (to, from) => [
  { event: "cmp:show", eventInfo: { path: `component.${to}` } },
  { event: "cmp:hide", eventInfo: { path: `component.${from}` } },
  { component: { "tabs-15b7": { shownItems: undefined } } },
  { component: { "tabs-15b7": { shownItems: [to] } } },
]

test("Core tabs: a real switch → one tab_select, cmp:hide never forwarded", () => {
  const results = run([TABS_SEED, ...switch_to("tabs-15b7-item-b", "tabs-15b7-item-a")])
  assert.deepEqual(
    results.map((r) => [r.event, r.document?.name ?? r.dropped]),
    [
      ["cmp:show", "tab_select"],
      ["cmp:hide", "rule false"],
    ]
  )
  assert.equal(results[0].document.value, "Einkäufe")
})

test("Core tabs: a click on the active tab (show + hide of the same panel) → no tab_select", () => {
  const results = run([TABS_SEED, ...switch_to("tabs-15b7-item-a", "tabs-15b7-item-a")])
  assert.equal(results[0].dropped, "no matching rule", "skip: already_shown")
  assert.deepEqual(results[0].rules, ["skip"])
  assert.equal(results[1].dropped, "rule false")
})

test("Core tabs: switch, then switch back — both are tab_select (state at each event)", () => {
  const results = run([
    TABS_SEED,
    ...switch_to("tabs-15b7-item-b", "tabs-15b7-item-a"),
    ...switch_to("tabs-15b7-item-a", "tabs-15b7-item-b"),
  ])
  assert.deepEqual(
    results.filter((r) => r.event === "cmp:show").map((r) => r.document?.value),
    ["Einkäufe", "Coupons"]
  )
})

// ---------- recorded init burst (Phase 0 spike, Fraport tabs page) ----------

test("recorded init burst → no event document (no spurious tab_select)", () => {
  const results = run([
    PAGE_SEED,
    TABS_SEED,
    { event: "cmp:show", eventInfo: { path: "page.contentPage-4675" } },
    { event: "acdl_helper:loaded" },
    { event: "cmp:loaded" },
    { event: "acdl_helper:dependencies_resolved" },
    { event: "acdl_helper:page:load", eventInfo: { path: "page.contentPage-4675" } },
  ])
  assert.equal(results.filter((r) => r.document).length, 0)
  assert.equal(results[0].dropped, "no matching rule", "the page's own cmp:show is not a tab")
})

// ---------- challenge 3: page() for events before the pageview ----------

test("an event snapshotted before the page node existed still gets page()-based defaults at build time", () => {
  const items = [
    { component: { "l-1": { "@type": "site/link", "dc:title": "Early" } } },
    { event: "cmp:click", eventInfo: { path: "component.l-1" } },
    PAGE_SEED, // the page node arrives later
  ]
  const [result] = run(items)
  assert.equal(result.document.page_name, "components:tabs")
})

// ---------- building rules ----------

const one_rule = (rule, options = {}) => ({ options, events: { "cmp:click": rule } })
const seeded = (node) => [{ component: { n: node } }, { event: "cmp:click", eventInfo: { path: "component.n" } }]

test("value defaults to dc:title; rule fields win over props of the same name in defaults", () => {
  const [result] = run(seeded({ "dc:title": "T" }), {
    defaults: { props: { page_name: "p" } },
    events: { "cmp:click": { group: "g", name: "n" } },
  })
  assert.deepEqual(result.document, { page_name: "p", track: "event", group: "g", name: "n", value: "T" })
})

test("a throwing resolver omits only its property and is reported", () => {
  const [result] = run(
    seeded({ "dc:title": "T" }),
    one_rule({
      group: "g",
      name: "n",
      props: {
        ok: "y",
        bad: () => {
          throw new Error("boom")
        },
      },
    })
  )
  assert.equal(result.document.ok, "y")
  assert.equal("bad" in result.document, false)
  assert.deepEqual(result.problems, [{ key: "bad", message: "resolver threw: boom" }])
})

test("a resolver returning an object is omitted and reported (flat documents)", () => {
  const [result] = run(seeded({}), one_rule({ group: "g", name: "n", props: { nested: () => ({ a: 1 }) } }))
  assert.equal("nested" in result.document, false)
  assert.equal(result.problems[0].key, "nested")
})

test("a resolver returning undefined omits the property silently", () => {
  const [result] = run(seeded({}), one_rule({ group: "g", name: "n", props: { maybe: () => undefined } }))
  assert.equal("maybe" in result.document, false)
  assert.deepEqual(result.problems, [])
})

test("group / name resolving to empty → dropped", () => {
  assert.equal(run(seeded({}), one_rule({ group: () => "", name: "n" }))[0].dropped, "empty group")
  assert.equal(run(seeded({}), one_rule({ group: "g", name: () => undefined }))[0].dropped, "empty name")
})

test("interactive and numvalue are set when valid, omitted and reported otherwise", () => {
  const [ok] = run(seeded({}), one_rule({ group: "g", name: "n", interactive: false, numvalue: () => 3 }))
  assert.equal(ok.document.interactive, false)
  assert.equal(ok.document.numvalue, 3)
  const [bad] = run(seeded({}), one_rule({ group: "g", name: "n", interactive: () => "no", numvalue: () => NaN }))
  assert.equal("interactive" in bad.document || "numvalue" in bad.document, false)
  assert.equal(bad.problems.length, 2)
})

test("a throwing skip() counts as 'not skipped' and is reported", () => {
  const [result] = run(
    seeded({}),
    one_rule({
      group: "g",
      name: "n",
      skip: () => {
        throw new Error("skip boom")
      },
    })
  )
  assert.equal(result.document.name, "n")
  assert.equal(result.problems[0].key, "skip")
})

// ---------- truncation (decision 8: only if configured) ----------

test("no limits configured → nothing truncated", () => {
  const long = "x".repeat(500)
  const [result] = run(seeded({ "dc:title": long }), one_rule({ group: "g", name: "n", props: { p: long } }))
  assert.equal(result.document.value.length, 500)
  assert.equal(result.document.p.length, 500)
  assert.deepEqual(result.truncated, [])
})

test("max_value_length truncates value and props; max_lengths overrides per property; group / name untouched", () => {
  const long = "x".repeat(300)
  const [result] = run(
    seeded({ "dc:title": long }),
    one_rule(
      { group: "g".repeat(30), name: "n", props: { p: long, link_url: long } },
      { max_value_length: 10, max_lengths: { link_url: 250 } }
    )
  )
  assert.equal(result.document.value.length, 10)
  assert.equal(result.document.p.length, 10)
  assert.equal(result.document.link_url.length, 250)
  assert.equal(result.document.group.length, 30)
  assert.deepEqual(result.truncated.sort(), ["link_url", "p", "value"])
})

test("numbers and booleans are never truncated", () => {
  const [result] = run(
    seeded({}),
    one_rule({ group: "g", name: "n", value: 123456789, props: { b: true } }, { max_value_length: 2 })
  )
  assert.equal(result.document.value, 123456789)
  assert.equal(result.document.b, true)
  assert.deepEqual(result.truncated, [])
})

// ---------- pageview document ----------

test("pageview document from the page node, truncated like events", () => {
  const { config } = validate_config(CONFIG)
  const { document } = build_pageview_document(PAGE_SEED.page["contentPage-4675"], config, {
    core: CORE,
    get_page: () => undefined,
  })
  assert.deepEqual(document, { track: "pageview", pagetitle: "Tabs", page_type: "ContentPage" })
})

test("page_node picks the page entry of a state", () => {
  assert.equal(page_node(PAGE_SEED)["dc:title"], "Tabs")
  assert.equal(page_node({}), undefined)
  assert.equal(page_node(undefined), undefined)
  void PAGE
})
