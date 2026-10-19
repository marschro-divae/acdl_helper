# Plugin - jentis

> Since 1.11.0. Requirements, decisions and review: [DOCS/FEATURES/jentis-bridge](/DOCS/FEATURES/jentis-bridge/README.md).

## Table of Contents

1. [Description](#description)
2. [Installation & Config](#installation--config)
3. [Configuration reference](#configuration-reference)
4. [Lifecycle](#lifecycle)
5. [Validation](#validation)
6. [Logging](#logging)
7. [Providers](#providers)
8. [Release Notes](#release-notes)

## Description

JENTIS is a server-side tag manager. Its only documented input on the website is `window._jts.push({...})`;
it cannot read the Adobe Client Data Layer's **state** — and a Core Components event like `cmp:click` carries
only `eventInfo.path`, the actual fields (`dc:title`, `xdm:linkURL`, `@type` …) live in that state.

This plugin bridges the two: it listens to the data layer, resolves the node every event refers to, applies a
declarative set of rules and writes JENTIS documents — `pageview` (+ `submit`) once per page and `event`
documents for interactions — exactly as JENTIS documents them.

The plugin is **destination-agnostic**: JENTIS can feed any analytics tool, so the plugin knows only JENTIS'
own interface. Limits of a destination (name lengths, value lengths, number of fields) are optional project
options — nothing is assumed by default.

- `name`: jentis
- `dependencies`: none
- `events`: none — the plugin registers its own data layer listener (deferred, guarded)

## Installation & Config

```javascript
acdl_helper({
  dependencies: ["cmp:loaded"],
  plugins: {
    page: { /* … */ },
    jentis: {
      partner_hosts: ["https://map.example.com", "shop.example.com"],         // sister sites → link_type "partner"
      families: [["*/contentTeaser/*", "teaser"], ["*/text/*", "rich_text"]],  // @type pattern → group
      options: {
        // limits of the destination(s) JENTIS feeds — all optional, none by default (example values)
        max_value_length: 100,
        max_lengths: { pagetitle: 300, page_location: 1000 },
        max_name_length: 40,
        max_props: 25,
        log: true,
      },
      pageview: {
        on: "acdl_helper:page:load",                      // the page plugin's page event
        props: { pagetitle: (page) => page["dc:title"], page_type: (page) => page["dlh:pagetype"] },
      },
      defaults: {
        props: { page_name: (cmp, h) => h.page()?.["dlh:pagename"] },
      },
      events: {
        "cmp:click": [
          { match: { "@type": "*/downloadlist/file" }, group: "download_list", name: "file_download",
            props: { link_url: (cmp) => cmp["xdm:linkURL"], file_type: (cmp) => cmp.fileType } },
          { match: { "@type": "*/link" }, group: (cmp, h) => h.family(cmp), name: "link_click",
            props: { link_url: (cmp) => cmp["xdm:linkURL"], link_type: (cmp, h) => h.link_type(cmp["xdm:linkURL"]) } },
        ],
        "cmp:show": [
          { match: { "@type": "*/tabs/item" }, skip: (cmp, h) => h.already_shown(cmp), group: "tabs", name: "tab_select" },
        ],
        "cmp:hide": false,
        "notification:shown": { group: "notification", name: "notification_shown", interactive: false },
      },
    },
  },
})
```

## Configuration reference

### Top level

| Key | Type | Default | Meaning |
|---|---|---|---|
| `partner_hosts` | array of host names or URLs | `[]` | the project's sister sites; `h.link_type()` labels links to them `partner` (not `internal`: a click to them leaves the site) |
| `families` | array of `[pattern, family]` | `[]` | `h.family()` — first wildcard pattern matching the node's `@type` wins, else `"other"` |
| `options` | object | see below | |
| `pageview` | object or `false` | `{ on: "<prefix>:page:load" }` | `false`: the pageview is sent elsewhere; events are not held for it |
| `defaults` | `{ props }` | `{}` | properties merged into every event document |
| `events` | object | `{}` | keyed by data layer event name; value: a rule, an array of rules (first match wins) or `false` (never forwarded) |

### Options

| Option | Default | Meaning |
|---|---|---|
| `max_value_length` | none | truncate string values (`value`, props) to this length; `group` / `name` are never truncated |
| `max_lengths` | `{}` | per-property overrides of `max_value_length`, e.g. `{ page_location: 1000 }` |
| `max_name_length` | none | rule and property names longer than this are rejected at init |
| `max_props` | none | warning at init when a document would carry more fields |
| `log` | `true` | mute switch for this plugin's per-event log; validation problems are always reported |
| `pageview_timeout` | `5000` | ms to hold event documents for the pageview before flushing them with a warning |

### Rules

| Field | Required | Type | Meaning |
|---|---|---|---|
| `group` | yes | string or `(cmp, h) => …` | JENTIS event `group` |
| `name` | yes | string or `(cmp, h) => …` | JENTIS event `name` |
| `value` | no | scalar or resolver | JENTIS event `value`; omitted → `cmp["dc:title"]` |
| `interactive` | no | boolean or resolver | JENTIS `interactive` (e.g. `false` for impressions) |
| `numvalue` | no | number or resolver | JENTIS `numvalue` |
| `props` | no | object of scalar or resolver | further properties — flat, names freely chosen except the JENTIS fields `track`, `type`, `group`, `name`, `value`, `interactive`, `numvalue` |
| `match` | no | object of field → wildcard pattern | all fields must match the resolved node (`*` = any characters) |
| `skip` | no | `(cmp, h) => boolean` | `true` excludes this rule (the next one is tried) |

For an event, the **first** rule whose `match` holds and whose `skip` does not return `true` builds the
document `{ ...defaults.props, ...rule.props, track: "event", group, name, value, interactive?, numvalue? }`.
No such rule → no document. A resolver that throws, or returns something other than a string, number or
boolean, omits only its property (reported in the log); `undefined` omits it silently. `group` / `name`
resolving to an empty value → no document.

### Resolvers and helpers

Resolvers are called `(cmp, h)` — for the pageview `(page, h)`:

- `cmp` — the event's node **as it was when the event happened**, also for events replayed after the plugin
  started (the plugin reconstructs that state from the data layer's own history; ACDL's `getState()` would
  return the current state), and for the same event repeated on the same node (each open / close of a row
  carries its own `state`). Includes `dlh:ownPath`, `dlh:ownId`, `dlh:parentComponent`.
- `h.page()` — the page node (available for every event, also those that happened before the page was known)
- `h.parent()` — the node of `cmp.parentId`, at the time of the event
- `h.already_shown(cmp?)` — `cmp` is already in its parent's `shownItems` (e.g. a click on the active tab)
- `h.link_type(url)` — `internal` / `partner` / `external` / `download` / `mailto` / `tel` / `other`, using
  `partner_hosts`
- `h.family(cmp_or_type)` — from `families`, fallback `"other"`
- `h.matches(node, test)` — the wildcard matcher of `match`
- `h.truncate(value, length)`, `h.event` (the data layer event)

## Lifecycle

- The plugin subscribes to every data layer event after its init (`scope: "all"`): events pushed **before**
  the library started are replayed, in order, with the state they had then.
- `window._jts` is created if JENTIS has not loaded yet (`window._jts = window._jts || []`); JENTIS reads
  the queue when it arrives.
- **Pageview first, once:** on `pageview.on` the plugin pushes `{ track: "pageview", …pageview.props }` and
  `{ track: "submit" }`. A second pageview event on the same page is ignored.
- **Held events:** documents for events that happen before the pageview are held and pushed right after
  it, in order — each with the state of its own event, while `h.page()` already sees the page.
- **Timeout:** no pageview within `options.pageview_timeout` → the held documents are pushed without it,
  with a warning naming the configured `pageview.on` (usually a renamed page event or a page plugin that
  could not resolve the page). From then on events go out directly; a late pageview is still sent once.
- `pageview: false` → no pageview, nothing held, no timer — for sites that send the pageview elsewhere.
- Events not listed in `events` are ignored. A throwing resolver never reaches the code that pushed to the
  data layer.

## Validation

The configuration is validated once, in `init()`, so a mistake shows up when the plugin starts — not when the
first matching event happens, or never. Every problem is logged with its config path, e.g.
`config events['cmp:click'][0].group: required: a non-empty string or a resolver function — rule skipped`.
The plugin keeps running with the valid rest:

| Problem | Level | Consequence |
|---|---|---|
| `group` / `name` missing or empty; invalid `match`, `skip`, `value`, `interactive`, `numvalue` | error | rule skipped |
| `name` longer than `max_name_length` | error | rule skipped |
| property named like a JENTIS field, longer than `max_name_length`, or with a non-scalar static value | error | property dropped, rule kept |
| more fields than `max_props` | warning | rule kept |
| unknown key (top level, rule, `options`, `pageview`, `defaults`) | warning | ignored |
| `pageview.on` without the global event prefix | warning | value kept |
| invalid option value | error | default used |

A plugin that fails during init never takes the library down: the core initialises every plugin in isolation
(since 1.11.0).

## Logging

Only through the library's shared logger — output appears when debug mode is on:
`acdl_helper.setDebug(true)` (per browser, persisted in `localStorage`, no deployment needed).
Every event the plugin sees gets one line (`<event> <reference or path>` first):

```text
[acdl_plugin: jentis] – test:early component.test-early held until the pageview
[acdl_plugin: jentis] – acdl_helper:loaded ignored: not in events
[acdl_plugin: jentis] – pageview (acdl_helper:page:load page.contentPage-4675c5e7d7) {…}
[acdl_plugin: jentis] – test:early component.test-early → test / early_event {…}
[acdl_plugin: jentis] – cmp:show page.contentPage-4675c5e7d7 not forwarded: no matching rule (#0 match, #1 match)
[acdl_plugin: jentis] – cmp:show component.tabs-15b7664e0f-item-edd69b26f7 → tabs / tab_select {…}
[acdl_plugin: jentis] – cmp:hide component.tabs-15b7664e0f-item-3ab55e4a53 not forwarded: rule false
[acdl_plugin: jentis] – cmp:show component.tabs-15b7664e0f-item-edd69b26f7 not forwarded: no matching rule (#0 skip, #1 match)
[acdl_plugin: jentis] – cmp:click component.text-b533f37b7f-link-1 → other / link_click (truncated: link_url) {…}
```

(recorded on an AEM tabs page; `test:early` is a test event pushed before the library started. The second
`cmp:show` of the same tab item is a click on the already active tab — skipped by `h.already_shown`.)

| Line | Level | Meaning |
|---|---|---|
| `→ group / name` + document | success | pushed to `_jts`; `(truncated: …)` names the values cut to their limit |
| `pageview (…)` + document | success | pageview pushed (followed by `submit`) |
| `held until the pageview` | info | sent right after the pageview (or at the timeout) |
| `ignored: not in events` | info | the event is not configured |
| `not forwarded: <reason>` | info | `rule false`, `no node` (path not in the state), `no matching rule (#i match \| skip …)` — why each rule did not apply —, `empty group`, `empty name`, `no page node`, `pageview already sent` |
| `<property>: <message>` | warning | a resolver threw or returned a non-scalar — only that property is omitted |
| `no "<pageview.on>" within … ms …` | warning | pageview timeout |

`options.log: false` mutes the per-event lines. **Not muted:** validation problems (at init) and the pageview
timeout — both point at a misconfiguration rather than at a single event.

## Providers

None.

## Release Notes

### 1.11.1

- Fixed: a live event repeated with the same `event` and `eventInfo` (e.g. toggling the same accordion row,
  pausing / resuming the same slider) was built from the **previous** event's state. ACDL appends a pushed item
  to `adobeDataLayer` only after its listeners ran; the history cursor now handles that order.

### 1.11.0

- New plugin. Configuration and validation; state at the event, rules and document building; listener,
  pageview-first lifecycle and sending to `_jts`; per-event log.
