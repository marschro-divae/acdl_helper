# jentis — bridge the Adobe Client Data Layer to JENTIS

## 0. Status & links

- Status: **1.11.0 shipped** (2026-10-16). Phases 0–6 done; Phase 7 (Fraport integration) open — see §8.
  **1.11.1** (2026-10-19): repeated identical live events got the previous event's state — §7.6. Follow-up 1.12.0
  in BACKLOG.
- Backlog: FEATURES → "jentis plugin".
- First consumer: Fraport travel (AEM, JENTIS + GA4, no Adobe Tags). Project-side mapping and
  project-specific rules live there: `fraport-travel/docs/tracking/jentis-mapping.md`.

## 1. Problem / motivation

Sites built with this library write facts to `window.adobeDataLayer` (Core Components collector,
`cmp:click` / `cmp:show` with only `eventInfo.path`; project services with `eventInfo.reference` and the
interaction fields; `acdl_helper:page:load`). JENTIS (server-side tag manager) documents exactly one input:
`_jts.push({...})`. Its "adobeDataLayer" source is undocumented, and the documented GTM data layer mapping
works on **pushed objects only** — a `cmp:click` would arrive without title, URL or type, because those live
in the data layer **state**.

So the library needs what `xdmtracker` does for the Web SDK: a declarative definition that turns ACDL
events + resolved component state into the vendor's format — here `_jts` documents.

## 2. Investigation — JENTIS facts (docs.jentis.com, 2026-10-16)

- `_jts.push(object)` — every push is a **document**. Reserved: `track` (+ `type`). Custom properties
  allowed; read in the JENTIS tag manager with "Get JTM data layer value" (document + property name).
  Nested access is **not documented** → flat keys only.
- Tracks: `pageview` (+ optional `pagetitle`, `group[]`, `breadcrumb[]`, `virtualPagePath`), then
  `{ track: "submit" }` to send; `event` with mandatory `group` + `name`, optional `value`, `numvalue`,
  `interactive` — an `event` submits immediately.
- Consent is handled by JENTIS (CMP connectors incl. Usercentrics); pushes before consent are held and
  re-processed within the same page.
- The JENTIS script may load late or be blocked → the documented `window._jts = window._jts || []` queue.
- GA4 (server-side tool): event name and parameters are mapped per tag in JENTIS; no enhanced measurement
  (outbound / downloads must come from our data).

## 3. What we rejected

- **Relying on JENTIS' "adobeDataLayer" source** — undocumented; cannot be shown to resolve state; every
  question would be a support ticket.
- **Emulating a GTM `dataLayer`** for JENTIS' documented GTM mapping — a second data layer to keep in sync,
  and that mapping also only reads pushed fields.
- **Positional / free-form arguments** — every value gets a fixed, documented property name instead.
- **Project-specific logic in the plugin** — the plugin is an engine; what a project reports, and how it
  names it, is configuration.

## 4. The solution (proposal)

> Refined by the challenge round in §7 — where §4 and §7/§8 differ (pageview mismatch warning, truncation,
> resolution timing, listener registration), §7/§8 win.

A plugin `jentis`, same shape and conventions as `xdmtracker` (config-time definition, resolvers), but it
**always listens** — there is no `autoTrack` switch. In `xdmtracker`, `autoTrack: false` serves a tag
manager rule that calls `track()` itself; JENTIS cannot read the data layer (the reason for this plugin), so
nothing would ever call it and `false` would only mean "send nothing".

```javascript
acdl_helper({
  dependencies: ["cmp:loaded"],
  plugins: {
    page: { ... },
    jentis: {
      partner_hosts: ["https://map.example.com", "…"],                     // sister sites → link_type "partner"
      families: [["*/contentTeaser/*", "teaser"], ["*/text/*", "rich_text"]], // @type pattern → group
      options: {
        // limits of the destination(s) JENTIS feeds — all optional, none by default (values: GA4, as an example)
        max_value_length: 100,               // limit per string property
        max_lengths: { pagetitle: 300, page_location: 1000 },  // per-property overrides
        max_name_length: 40,                 // rule names and property names
        max_props: 25,                       // fields per document (warning)
        log: true,                           // default; shared logger, see "Logging" below
      },
      pageview: {                            // one pageview + submit per page
        on: "acdl_helper:page:load",         // must match the page plugin's event (default shown), see Rules
        props: { pagetitle: (page) => page["dc:title"], page_type: (page) => page["dlh:pagetype"] },
      },
      defaults: {                            // merged into every event document
        props: { page_name: (cmp, h) => h.page()?.["dlh:pagename"] },
      },
      events: {                              // keyed by ACDL event name
        "cmp:click": [                       // array: first entry whose match/skip passes wins
          { match: { "@type": "*/downloadlist/file" },
            group: "download_list", name: "file_download",            // value defaults to dc:title
            props: { link_url: (cmp) => cmp["xdm:linkURL"], file_type: (cmp) => cmp.fileType } },
          { match: { "@type": "*/link" },
            group: (cmp, h) => h.family(cmp), name: "link_click", value: (cmp) => cmp["dc:title"],
            props: { link_url: (cmp) => cmp["xdm:linkURL"], link_type: (cmp, h) => h.link_type(cmp["xdm:linkURL"]) } },
        ],
        "cmp:show": [
          { match: { "@type": "*/tabs/item" }, skip: (cmp, h) => h.already_shown(cmp),
            group: "tabs", name: "tab_select", value: (cmp) => cmp["dc:title"] },
        ],
        "cmp:hide": false,                   // explicitly never forwarded
        "slider:navigate": { group: "slider", name: "slider_navigate", value: (cmp) => cmp.trigger,
                             props: { slide_position: (cmp) => cmp.slidePosition } },
      },
    },
  },
})
```

**Resolution (what a resolver gets):**

- `cmp` — the event's node, resolved: `getState(eventInfo.path ?? eventInfo.reference)` merged with the
  push's own fields under that path (interaction data wins). No node → the event is dropped (debug log).
- `h` (helpers) — `event` (raw push), `page()` (page node), `parent(cmp)` (node of `cmp.parentId`),
  `already_shown(cmp)` (`cmp.id` is in the parent's `shownItems` — the parent still holds the state from
  before the event), `truncate(str, n)`, plus the **core helpers** (decision 3: pure functions in core,
  handed out unbound via `context.helpers`; the plugin binds its own config): `link_type(url)` (`mailto` /
  `tel` / `download` (`/content/dam/`) / `internal` (relative, current host) / `partner` (host in the
  plugin's `partner_hosts`) / `external`), `family(cmp_or_type)` (first matching pattern of the plugin's
  `families`, fallback `"other"`), `matches(node, test)`.

**Rules**

- Values: static or resolver function, exactly as in `xdmtracker`. A resolver returning `undefined` omits the
  property. Strings are truncated per property — `max_lengths[key]`, else `max_value_length`, if configured
  (decision 8; e.g. GA4 does not log over-long values at all, challenge 8). `value` omitted →
  `cmp["dc:title"]` (decision 2).
- `match`: object of node fields → wildcard pattern (same matcher as the core / `page` plugin); all must
  match. `skip(cmp, h)`: `true` drops the event.
- An event name with `false` (or no entry) is ignored. One ACDL event → at most one `_jts` document.
- `partner_hosts` and `families` are **`jentis` configuration** (challenge 7): `families` is JENTIS output
  naming, and no second consumer needs either yet. The helpers themselves are pure core functions; promote
  the configuration to core once a second plugin needs it.
- Output: `{ track: "event", group, name, value, ...props }` — props are flat; keys are used as given.
- The pageview fires once per page; a second `on` event is ignored.
- **Pageview trigger** (decision 4): configured explicitly, `pageview.on`, default
  `<global event prefix>:page:load` (the page plugin's default). A project that renames the page event
  (`page_load_event: "view"`) sets `on` accordingly. **Safety net:** if any other `<prefix>:page:*` event
  arrives, the plugin logs a warning that `pageview.on` probably does not match the page plugin — visible as
  soon as debug is on.
  Rejected: deriving it from the page plugin's config — a plugin sees only its own `config`; exposing all
  plugin configs in the context would add a core API and couple `jentis` to another plugin's internal key
  for one convenience.
- Replays events that happened before the plugin initialised (listener `scope: "all"`), but only after the
  pageview, so JENTIS sees the page first.

**Logging**

- Only through the shared `context.logger` — no logging of its own. Output therefore appears only when the
  library's debug mode is on: `acdl_helper.setDebug(true)` (persisted in `localStorage`, key
  `acdl_helper_debug`). Per browser, switchable at runtime — no deployment needed to debug a live site.
- `options.log` (default `true`) is a **mute switch** for this plugin: with debug on, it logs every
  ACDL event → `_jts` document (and every dropped event with the reason: no node, no rule, `skip`, `false`);
  `log: false` silences just this plugin when its output drowns the others.

## 5. Acceptance criteria

1. A `cmp:click` on a seeded link produces one `_jts` event document with resolved `dc:title`,
   `xdm:linkURL` and `@type` values — tested with recorded ACDL sequences.
2. The Core tabs sequence for a click on the active tab (`cmp:show` + `cmp:hide`, same panel) produces no
   document; a real tab switch produces one.
3. No `_jts` present → documents queue in `window._jts`; JENTIS picks them up when it loads.
4. One pageview + submit per page, before any event document.
5. `node:test` coverage for resolution, matching, skip, link_type, truncation, queueing, replay order.
6. With `acdl_helper.setDebug(true)` every forwarded and every dropped event is logged (with the drop reason);
   with debug off, or `log: false`, the plugin logs nothing.
7. Without `pageview.on` the pageview fires on `<prefix>:page:load`; with `on` set, on that event; another
   no pageview within `pageview_timeout` → held events flushed with a warning naming `pageview.on`;
   `pageview: false` → no pageview, events not held (challenge 10).
8. `link_type` / `family` live in core with their own tests; `jentis` (and later `xdmtracker`) use them.
9. README in `src/plugins/jentis/`, main README, CHANGELOG, version bump.

## 6. Decisions (Martin, 2026-10-16)

1. **Name `jentis`** — the plugin is JENTIS-specific (`_jts` documents, tracks); no generic forwarder.
2. **`value` defaults to `dc:title`** when a rule omits it.
3. **`link_type`, `family` and the matcher move to core** as pure, reusable functions (also for
   `xdmtracker`), handed to plugins unbound as `context.helpers`; their configuration lives in the plugin
   that uses them (revised by challenge 7).
4. **Pageview trigger configured manually** (`pageview.on`, default `<prefix>:page:load`) plus a mismatch
   warning — no core change. Reading other plugins' configs was considered and rejected (coupling, new core
   API for one convenience).
5. **Logging** only through the shared logger (`setDebug`), `options.log` as a per-plugin mute switch.
6. **Config validation at init** — misconfiguration is reported when the plugin starts, not when the first
   matching event happens (or never).
7. **No `autoTrack` switch** — the plugin always listens (no external caller exists for JENTIS). To stop
   forwarding, the project removes the plugin from its config.
8. **Destination-agnostic** (Martin, 2026-10-16): JENTIS is a tag manager and can feed any analytics tool
   (GA4, Matomo, Piano, server endpoints …). The plugin knows only JENTIS' own interface (`_jts` documents,
   reserved fields `track`, `type`, `group`, `name`, `value`, `interactive`, `numvalue`). Destination limits —
   `max_value_length`, `max_lengths`, `max_name_length`, `max_props` — are optional project options, **off by
   default**; no destination name in the code. A project reporting to GA4 sets GA4's values (Fraport: its
   mapping doc). Revises the "defaults = GA4" of challenge 8.

## 7. Challenges (review round, 2026-10-16)

Architecture review of this proposal against the code. The concept fits the plugin architecture (context is
the only core → plugin channel, no cross-plugin config, no runtime deps, `xdmtracker`-style config-time
definition). The points below are folded into the implementation plan (§8); pre-existing issues are fixed as
part of this feature where they touch it. Status per point: **open** / **planned (phase)** / **decided**.

### 7.1 Must address before implementation

1. **Core not testable in Node** — *planned (Phase 0)*. Core and `page` use extensionless imports
   (`./lib/statics`); `import("src/core/lib/plugin_utils.js")` and `import("src/plugins/page/index.js")` fail
   with `ERR_MODULE_NOT_FOUND` (verified). All 137 existing tests cover `xdmtracker` only. Phase 1 tests
   (`context.helpers`, matcher characterization via `page`) cannot be written until imports carry `.js`
   (webpack accepts both, `fullySpecified: false`).
2. **One failing plugin `init()` kills the library** — *planned (Phase 0)*. `init_plugins`
   (`src/core/lib/plugin_utils.js`) has no per-plugin try/catch; it runs inside the dependency-resolved
   callback (`src/core/index.js`), so a throw happens inside the ACDL dispatch, `window.acdl_helper` never
   becomes the API and `page` dies too. Decision 6 makes jentis' `init()` the most complex in the repo →
   the core isolates each plugin (catch, log, drop only that plugin).
3. **`h.page()` is not available for early events** — *done (Phase 3/4)*. Events before the pageview
   (replayed init burst via `scope: "all"`, or much longer with `page_load_dependencies`) are held. Building
   documents at event time → `page()` undefined, `defaults.props.page_name` silently missing; building at
   flush time → `cmp` / `already_shown` see later state. **Rule:** snapshot the node (and its parent) at event
   time, run the resolvers at flush time (page known).
4. **Third copy of node resolution** — *planned (new resolver: Phase 1 / 1.11.0; migration of `catch`,
   `page`, `xdmtracker`: 1.12.0)*. Exists in `event_catcher.js` and duplicated in
   `page/lib/get_component_data.js`; jentis would add a third. `catch` only accepts Launch-wrapped events
   (`$type`), which is why `xdmtracker` fakes `$type` for autoTrack. → one core resolver that accepts raw
   ACDL events (and Launch events), handed to plugins via `context`; `catch`, `page`, `xdmtracker`, `jentis`
   use it; the `$type` shim goes.
5. **Deferred-registration workaround would be copied into a second plugin** — *planned (`subscribe`:
   Phase 1 / 1.11.0; `xdmtracker` and `meta.events` onto it: 1.12.0)*. The
   `setTimeout 0` registration (DOCS/FEATURES/xdmtracker-autotrack §2a) is a core concern (AEM ACDL timing)
   → core-owned subscription, e.g. `context.acdl.subscribe(event, handler, options)` that registers after
   init; `xdmtracker` autoTrack and `jentis` use it. **Open question:** the core's own `meta.events`
   handlers are registered inside the same dispatch. `page` works because its `cmp:show` is part of the
   replayed init burst; later events (e.g. `cleanup`'s `acdl_helper:cleanup`) may be affected in live AEM —
   to verify in the browser (Phase 0 spike); if confirmed, `register_plugin_event_handler` uses the same
   deferred subscription.
6. **`this.getState` = state at event time is unverified** — *planned (Phase 0 spike)*. `already_shown` and
   replay correctness depend on it. Verify in a real AEM page **before** Phase 3, not in Phase 7
   (observed behaviour wins).

### 7.2 Design challenges

7. **Decision 3 (`links` / `families` as core config)** — *decided 2026-10-16: alternative accepted —
   pure core functions, configuration in `jentis`*. Core config is purely
   infrastructural today (`event_prefix`, `dependencies`, `plugins`); the README puts project-specific
   behaviour into plugins, and `families` is a reporting taxonomy. Alternative: pure functions in core,
   handed out unbound via `context.helpers` (`link_type(url, { partner_hosts })`, `family(type, families)`),
   configuration in the `jentis` plugin; promote to core config when a second consumer exists (`xdmtracker`
   does not use them yet). If kept in core: group under one key and validate — `merge_configs` accepts any
   top-level key unchecked.
8. **Truncating every string to 100 cuts URLs** — *planned (Phase 2/3; GA4 limits verified, see §7.4)*. `link_url` / page URLs would break
   (GA4 `page_location` allows 1000). → per-property limits (`max_value_length` default + overrides /
   exemptions). Verify whether JENTIS truncates by itself.
9. **`props` can overwrite `group` / `name` / `value`** — *planned (Phase 2)*. With
   `{ track, group, name, value, ...props }` → validation rejects `group`, `name`, `value` (besides `track`,
   `type`) in `props`, and the builder spreads props first.
10. **`<prefix>:page:*` mismatch warning is redundant** — *done (Phase 4)*. The pageview timeout already
    catches a wrong `pageview.on` → drop the heuristic; the timeout warning names the configured `on`.
    Also allow `pageview: false` (pageview sent elsewhere; events are then not held).
11. **Replay delivers the init burst** — *planned (Phase 3 tests)*. If Core Components push `cmp:show` for
    initially active tab / carousel items on load, they become `tab_select` documents. Record a real init
    sequence and add it as a test case; handle it with rules or a replay guard depending on what is observed.
12. **`interactive` / `numvalue` as first-class rule fields** — *planned (Phase 2/3)*. JENTIS reserves them;
    `interactive: false` affects GA4 engagement. Same value semantics as `value` (static or resolver).

### 7.3 Pre-existing issues found (fixed in 1.11.0 where cheap or critical, otherwise 1.12.0)

13. **`context.shared` is not shared** — every plugin gets its own `{}` (`plugin_utils.js`). Only `page` uses
    it (own state). → rename to what it is (plugin-private state) or make it actually shared — *1.12.0*.
14. **`catch(event).get()` throws a `TypeError` on non-ACDL events** (`get` is `undefined`); the README
    promises only a warning. → fixed with the core resolver migration (point 4); `get` always a function —
    *1.12.0*.
15. **Duplicated helpers** — matcher twice (core + `page`), `update_object` in five places (core `utils`,
    `page`, `cleanup`, `user`, `usercentrics`). → *1.12.0* (new `match.js` exists from 1.11.0).
16. **Docs drift** — main README says default `dependencies` is `['launch:loaded']`; `config.default.js` has
    `[]`. → *fixed in Phase 6* (README default `[]`).
17. **A throwing listener breaks the pushing code** (found in the Phase 0 spike, ACDL 2.0.2 in AEM) — *fixed in
    Phase 0 (decided Martin 2026-10-16)*: `guarded()` in `core/lib/utils.js`; tests
    `tests/core-acdl-listeners.test.js` (4 characterization green before and after, 3 new red before → green);
    verified against the real ACDL 2.0.2 (`push()` no longer throws, later listeners run, `this.getState`
    intact); golden master on the AEM tabs page identical (§7.5). An exception in one ACDL listener propagates **out of `push()`** to the caller
    (Core collector click handler, project data layer services, components) and the **following listeners for
    the same event are not called**; the next push works again. Any plugin handler (`meta.events`,
    `xdmtracker` autoTrack today, `jentis` resolvers) can thereby break site JavaScript and silence other
    plugins. → the core wraps every listener it registers (`utils.acdl.add_event_listener`) in try/catch: log,
    never rethrow, keep `this` (for `this.getState`), original → wrapper in a `WeakMap` so
    `remove_event_listener` still works. One core change, no plugin migration; characterization tests first.
18. **Loading the module could abort the library** (found while making the core testable) — *fixed in Phase 0*.
    `core/lib/utils.js` read `localStorage.getItem(...)` unguarded at module load; where accessing
    `localStorage` throws (sandboxed iframe, storage blocked by browser settings) the library never started.
    → `read_debug_flag()` with try/catch (also treats a `localStorage` without `getItem` — Node 25 — as off).
    Tests: `tests/core-utils-debug.test.js`.

### 7.5 Phase 0 spike results (2026-10-16, ACDL 2.0.2, Fraport tabs page on AEM, headless Chrome)

| Question | Observed | Consequence |
|---|---|---|
| (a) `this.getState` in a listener = state at event time? | **live: yes** (listener runs synchronously inside the push); **replay (`scope: "past"/"all"`): no** — `this.getState` and `window.adobeDataLayer.getState` both return the **current** state | Phase 3 cannot rely on `this.getState` for replayed events. **Decided (Martin, 2026-10-16): option 2** — for replayed events the plugin reconstructs the state at event time by merging the ACDL array up to the event's index (ACDL keeps every push); live events use `this.getState`. Applies to the node and its parent (`already_shown`) |
| (b) listener registered inside a running dispatch gets later events? | **yes** — plain, `scope: "all"` and deferred all fired for a later push | the `xdmtracker` live drop does not reproduce for a registration inside an ordinary dispatch after load; it likely needs the ACDL library's own initial processing. Keep the deferred registration (proven, cheap); the `meta.events` question (challenge 5) is less urgent |
| (c) init burst | `cmp:show` (page), `acdl_helper:loaded`, `cmp:loaded`, `acdl_helper:dependencies_resolved`, `acdl_helper:page:load` — **no tab `cmp:show` on load** | challenge 11 does not occur for Fraport's tabs; keep the recorded sequence as a test case |
| (d) throwing listener | `push()` **rethrows** to the caller; later listeners for that event **skipped**; next push fine | challenge 17 (new) |

Harness: `scratchpad` CDP script (login-token cookie, `Runtime.evaluate`, optional `Fetch` interception that
serves a local build instead of the deployed acdl_helper clientlib) — reusable for the Phase 6/7 browser checks.

**Golden master after Phase 0** (same AEM tabs page, shipped 1.10.0 vs. Phase 0 build injected, marked
`1.11.0-dev` to prove which build ran): events and page state after load **identical**; after a tab switch
**identical**; API keys identical. Plugin chunks byte-identical to 1.10.0, only the core entry changed. The
page loads only the `page` plugin — the other plugins (`cleanup`, `clickables`, `component`, `user`,
`usercentrics`, `xdmtracker`) are covered by byte-identical chunks and the unit suite; a browser golden master
with **all** plugins configured (library dev server) belongs to Phase 6.

**Proof standard for this library** (used in many large brand sites): where nothing is meant to change, the
built bundle must be byte-identical; every behaviour change starts with characterization tests that are green
on the old code; a golden master in a real page before release.

### 7.4 Second opinion on the challenges (2026-10-16)

Re-checked in the code: **1** confirmed (`ERR_MODULE_NOT_FOUND` for `./statics`), **2** confirmed
(`init_plugins` without try/catch, called from `acdl_helper.js` inside the dependency listener in
`index.js`), **14** confirmed (`get_component_state` returns `undefined` for non-ACDL events). **11** — for
the first consumer (Fraport, Core tabs): the tabs runtime pushes only in `navigateAndFocusTab` (click, keys,
deep link), not on load; the page's own `cmp:show` is excluded anyway. Keep the recorded-init test.

| # | Verdict | Note |
|---|---|---|
| 1, 2, 9, 10, 12, 16 | agree | 2 is the key one: a jentis config mistake must not take `page` (page tracking) down |
| 3 | agree | snapshot node + parent at event time, resolve at flush time |
| 4, 5 | agree with the goal, **split the scope** | new core resolver and `context.acdl.subscribe` now, used by `jentis`; migrating `catch`, `page`, `xdmtracker` (incl. dropping the `$type` shim) touches every existing consumer → follow-up release with its own characterization tests |
| 6 | agree, **pull forward** | can run now against a real AEM page (local Fraport instance, headless Chrome via CDP) — research, not implementation |
| 7 | **agree with the challenge** (revises decision 3's placement) | `families` is JENTIS output naming → `jentis` config; helpers stay pure functions in core, handed out unbound; `partner_hosts` in `jentis` too until a second consumer needs it |
| 8 | agree, **per-property limits — configurable, off by default** (revised by decision 8: no destination defaults in the plugin; GA4's values below are what a GA4 project configures) | Verified against Google's [event collection limits](https://support.google.com/analytics/answer/9267744): event parameter values 100 characters, `page_title` 300, `page_referrer` 420, `page_location` 1,000 (encoded length); names 40; 25 parameters per event; not raised by GA4 360. Google states over-limit items are **not logged** (no truncation mentioned) — so an over-long value would vanish, not arrive shortened. → truncate per property (default 100, overrides per key, e.g. `pagetitle` 300, `page_location` 1000); `link_url` is a normal event parameter (100). Validation also enforces ≤ 25 props and ≤ 40-character names. To verify once JENTIS is publishable: does JENTIS' GA4 tag truncate by itself, and does GA4 drop or truncate in practice (test event with a 150-character value). |
| 13, 15 | defer | real but not needed for `jentis` → BACKLOG CHORES |
| 14 | with 4 | or a minimal fix now (`get` always a function) |

**Proposed release split** (freeze for the first consumer: 2026-11-13):

- **1.11.0:** 1, 2, 6 (spike), 16; new core parts for `jentis` only (resolver, `subscribe`, pure helpers);
  plugin incl. 3, 8, 9, 10, 12; config placement per 7.
- **1.12.0:** migrate `catch` / `page` / `xdmtracker` to the core resolver and `subscribe` (4, 5, 14), then
  13, 15 — each with characterization tests first.

Decided (Martin, 2026-10-16): **split accepted** (1.11.0 / 1.12.0), **7 accepted** — `families` and
`partner_hosts` are `jentis` configuration, the helpers are pure core functions handed out unbound.

### 7.6 Live events in the history cursor (1.11.1, 2026-10-19)

**Symptom** (Fraport, local AEM, first two consumers of state-dependent rules): the data layer was right, the
JENTIS documents lagged one event behind whenever the **same** event repeated on the **same** node.
`slider:autoplay` pause / play / pause → `_jts` `slider_autoplay` pause / **pause** / **play**. An accordion rule
with `skip: (cmp) => cmp.state !== "open"` sent `accordion_open` for every close as well. Rules that read only
static node data (`cmp:click` on links) were unaffected, which is why no earlier ticket saw it.

**Investigation — proved, not assumed:**

- ACDL 2.0.2's `push` processes each item first — state update **and listeners** — and only then calls
  `Array.prototype.push` (source: `n.push = function (t) { … u(e) … return Array.prototype.push.apply(this, r) }`).
  Probe on the AEM page: inside a listener `adobeDataLayer.length` was 41, after the push 42, and the last item
  was not yet the pushed one.
- §7.5 (a) had already observed that a live listener runs *inside* the push; the decision was "replayed events
  reconstruct from the array, **live events use `this.getState`**". Phase 3 implemented **one** cursor for both,
  with `this.getState()` only as fallback, and its header assumed "the array keeps every push, in push order" at
  delivery time. That holds for replayed events, not for live ones.
- Consequence: a live event is not in the array yet → `state_at` misses (the fallback `this.getState()` is
  correct, ACDL updated the state before the listeners), but the cursor has moved to the end. The item is
  appended right after. The **next** event with the same `event` + `eventInfo` scans from there, matches the
  previous item and is built from its state.
- Why the tests did not catch it: `tests/jentis-history.test.js` "live: the array grows between calls" appends
  the item **before** asking; the fake ACDL in `tests/jentis-sender.test.js` and the one in Fraport's spec
  append before delivering. All three model the wrong order.

**Fix:** the cursor remembers a missed event as **pending** — a miss can only be a live event (replayed events
are in the array by construction). When its item appears, it is folded into the state like any other item but
**never matched**; pending events are found by content, not by position, because a listener that pushes itself
(nested push) gets its item appended *before* the outer one. Live events keep using `this.getState()`, as
decided in §7.5. No config, no API change.

**What didn't work / not done:** folding the listener's copy of the event into the cursor state on a miss
(would make the cursor self-sufficient) — rejected: it relies on ACDL passing the full pushed item to listeners,
which §7.5 did not verify, and `this.getState()` is already exact for live events.

**Tests:** characterization first — the 15 existing cursor tests and the plugin tests (item appended before
delivery, which is also how a replayed event finds its item) stay green unchanged. New: 5 cursor tests and 4
plugin tests in the real ACDL order (`fake_acdl({ acdl_order: true })`) — repeated identical events, a `skip` on
the event's own state, replay then live, nested push; red on 1.11.0 (7 of 9), green on 1.11.1. Mutation check:
matching pending events by position instead of content is caught by the nested-push plugin test. **397/397.**

**Outcome:** _(after the Fraport browser check: data layer vs. `_jts` per click on the accordion and slider
pages)_

## 8. Implementation plan

### What already exists (verified in the code, 2026-10-16)

- `context.catch(event)` (core `event_catcher.js`) resolves an event's node via `getState` —
  `eventInfo.reference` first, then `eventInfo.path` — and adds `dlh:ownPath`, `dlh:ownId`,
  `dlh:parentComponent`. It reads the **current** state (`window.adobeDataLayer.getState`).
- The wildcard matcher (`test_dataLayer_object`, `wildcardToRegExp`) is module-private in
  `event_catcher.js` (and duplicated in the `page` plugin); `catch` matches with `one_of: true` (any field).
- `xdmtracker` shows the patterns to reuse: config-time definition, `resolve(v, cmp)` for static-or-function
  values, and the **deferred autoTrack registration** (`setTimeout 0` after init — a listener registered
  during init's own dispatch never fires again in live AEM; DOCS/FEATURES/xdmtracker-autotrack).
- `page` plugin `init()` validates its config and logs precise errors — the model for decision 6.
- Tests: `node:test`, stubs for `window` / `acdl` / logger (`tests/helpers.js` `make_logger`); the dev
  server (`server/`, express + sample pages) for manual browser checks.

### Phase 0 — make the core testable and robust (challenges 1, 2, 5, 6)

1. Add `.js` extensions to all relative imports in `src/core` and `src/plugins/page` (and the other plugins
   for consistency); `npm run build:prod` output unchanged, suite green.
2. **Plugin init isolation:** characterization tests for `init_plugins` (today: a throwing plugin aborts all),
   then per-plugin try/catch in `impl()` / `init()` / `provider()` — log the error, drop only that plugin,
   the others and the API come up. Tests: one plugin throws → others initialised, API exists.
3. **Browser spike** (dev server + a real AEM page): (a) does `this.getState(path)` in an ACDL listener return
   the state at event time, for live and replayed events? (b) does a `meta.events` handler registered during
   init receive events pushed later (e.g. `acdl_helper:cleanup`)? (c) record the init burst of a page with
   tabs / carousel (which `cmp:show` arrive on load). Results go into this README (§2 / §7) — they decide
   Phase 1 step 5 and Phase 3 resolution.

### Phase 1 — core helpers (refactor + additions)

> **Done 2026-10-16** (branch `feature/jentis-bridge`, uncommitted). New: `core/lib/match.js` (`matches`),
> `core/lib/resolve_node.js`, `core/lib/link.js` (`link_type`, `family`), `acdl.subscribe()` (deferred,
> guarded, returns `unsubscribe`, works destructured), `context.helpers` (frozen, the same object for every
> plugin). Tests: `core-match` (19 cases, today's page matcher vs. new — equal for all and one_of; defined
> `false` where the old ones throw), `core-resolve-node` (equal to `catch().get()` for raw and Launch-wrapped
> events; no state mutation; never throws), `core-link` (22 URL cases incl. DAM on a foreign host, partner
> origins, other schemes; family edge cases), `core-acdl-listeners` (+5 for `subscribe`), `core-init-plugins`
> (context gains `helpers` — the one deliberate change to a characterization test). **256/256.** Bundle:
> plugin chunks byte-identical to 1.10.0, core entry 10,493 → 13,620 bytes. Golden master (AEM tabs page,
> 1.10.0 vs. injected build): after load and after a tab switch **identical**; the page's one
> `Uncaught (in promise)` exists with 1.10.0 too (Fraport notification feeds).
> Decisions while implementing: `link_type` → `download` only for internal URLs (a DAM path on a foreign host
> is `external`); non-web schemes → `other`; empty / unparseable → `undefined`.

1. **Characterization tests first** for today's matcher behaviour (as used by `catch` and the `page`
   plugin): wildcard `*`, exact non-strings, `one_of` vs. all, missing fields; and for `catch(event).get()`
   (Launch event, path vs. reference, `dlh:own*` enrichment, non-ACDL event).
2. New `src/core/lib/match.js`: `matches(node, test, { all = true })` — same semantics as today's matcher
   (the characterization tests run against both). In 1.11.0 only `jentis` uses it; `event_catcher` and
   `page` switch in 1.12.0.
2a. **New core node resolver** (challenge 4): `src/core/lib/resolve_node.js` — accepts a raw ACDL event or a
   Launch-wrapped one, optional `get_state` (for `this.getState`), returns the enriched node or `undefined`.
   Exposed via `context`; in 1.11.0 used by `jentis` only (`catch`, `page`, `xdmtracker` and the `$type` shim:
   1.12.0).
2b. **New core-owned subscription** (challenge 5): `context.acdl.subscribe(event, handler, options)` with the
   deferred (post-init) registration; in 1.11.0 used by `jentis` only (`xdmtracker` autoTrack and, if the
   spike confirms the drop, `register_plugin_event_handler`: 1.12.0).
3. New `src/core/lib/link.js`: `link_type(url, { partner_hosts = [], current_host = location.hostname })`
   → `mailto` / `tel` (scheme) / `download` (`/content/dam/`) / `internal` (relative or current host) /
   `partner` (host in `partner_hosts`) / `external`. **Partner hosts are labelled, not counted as internal**:
   a click to a sister site leaves this site (and usually its analytics property) — whether that is an exit
   is a reporting decision, the value keeps both possible. Matching: exact host (entries may be given as
   origins, `https://map.example.com` → `map.example.com`); no wildcard or subdomain matching — projects
   list concrete sites. `family(type, families)` (ordered `[pattern, family]` list, first match, fallback
   `"other"`). Tests for each branch, incl. malformed URLs.
4. **`context.helpers`** (challenge 7 decided): `init_plugins` passes a frozen object of the **pure**
   functions `matches`, `link_type(url, { partner_hosts })`, `family(type, families)` into every plugin
   context — no core configuration. Tests: every context gets `helpers`; existing plugins are unaffected.

### Phase 2 — plugin skeleton + config validation

- `src/plugins/jentis/index.js` (meta: `name: "jentis"`, no `events` of its own — one data layer listener), from the
  `_template`.
- `lib/validate.js`, run in `init()`; every problem is logged with its config path, invalid rules are skipped,
  the plugin keeps running with the valid rest:
  - `events`: object; each value a rule, an array of rules or `false`; unknown top-level keys → warning.
  - rule: `name` and `group` required (string or function); `value`, `props.*`: static or function;
    `match`: object of string patterns; `skip`: function; unknown rule keys → warning (typos like `prop`).
  - `pageview.on`: string with the global event prefix; `pageview.props` like rule props.
  - `options`: `max_value_length`, `max_name_length`, `max_props`, `pageview_timeout` positive integers,
    `max_lengths` object of positive integers, `log` boolean; `partner_hosts` array of strings / origins;
    `families` array of `[pattern, family]` pairs.
  - destination limits, only if configured (decision 8): rule / property names over `max_name_length` →
    error (rule skipped / property dropped); more fields than `max_props` → warning.
  - property names: must be flat strings; reserved `track` / `type` and the rule fields `group` / `name` /
    `value` / `interactive` / `numvalue` rejected in `props` (challenge 9).
  - rule fields `interactive` / `numvalue`: static or function (challenge 12).
  - `pageview`: object or `false` (challenge 10).
- Tests: one per check (valid config → no log; each mistake → exactly one error with the path).

### Phase 3 — resolution and document building

> **Done 2026-10-16** (uncommitted). `lib/history.js` (cursor; 15 tests; verified against ACDL 2.0.2 in AEM —
> whole-array fold equals `getState()`, live events equal `this.getState()`), `lib/document.js`
> (`take_snapshot`, `build_event_document`, `build_pageview_document`, `page_node`; 22 tests from recorded
> sequences: Core link click, download vs. link rule order, our `slider:navigate`, Core tabs switch /
> active-tab click / switch back, recorded init burst, page() for early events, resolver errors, truncation
> only when configured). Mutation check: 5 mutations, all caught. **354/354.** Plugin README updated.

- No own resolver: node = the core resolver (Phase 1 step 2a), via `eventInfo.reference ?? eventInfo.path`.
  State source per the spike (§7.5 a, option 2), refined by a second spike (2026-10-16, ACDL 2.0.2): a listener
  gets a **copy** of the pushed item (no position by identity), merge rules are **deep for objects, by index
  for arrays, `undefined` and `null` delete**. → `lib/history.js`: one **history cursor** for live and
  replayed events alike — walks the `adobeDataLayer` array forward once, folds the state incrementally and
  returns the state right after the next item with the same `event` + `eventInfo` (foreign pushes in between
  do not disturb it; identical events match in order). **Verified in AEM:** folding the whole array equals
  ACDL's `getState()`; at every live event the cursor equals ACDL's live `this.getState()` (tabs, page load,
  array / `null` / `undefined` merges); for replayed init events the cursor returns the historical state,
  ACDL the current one.
- **Snapshot now, resolve later** (challenge 3): at event time the plugin stores `{ event, cmp, parent }`
  (node snapshots); the rule's resolvers run when the document is built — immediately once the pageview is
  sent, at flush time for held events — so `h.page()` is always available and `cmp` / `already_shown` see
  the state of the event. `h.parent()` returns the snapshot.
- `lib/document.js`: pick the rule (`false` → drop; array → first whose `match` passes and `skip` is not
  true); build `{ ...defaults.props, ...rule.props, track: "event", group, name, value, interactive?,
  numvalue? }` (rule fields win, challenge 9); `value` defaults to `dc:title`; resolver `undefined` →
  omitted; resolver error → logged, property omitted; non-scalar values → logged and omitted (flat
  documents only).
- **Truncation per property** (challenge 8, decision 8): `options.max_lengths[key]`, else
  `options.max_value_length` — both optional, no limit by default. Applies to `value` and props (strings);
  `group` / `name` are not truncated (validated against `max_name_length` at init).
- helpers `h`: `event`, `page()`, `parent(cmp)`, `already_shown(cmp)`, `truncate`, core `link_type`,
  `family`.
- Tests with **recorded sequences** (shape copied from real pages): `cmp:click` on a seeded link; our
  service's `slider:navigate` (`reference` + own fields); the Core tabs sequence for a switch and for a click
  on the active tab (`cmp:show` → `cmp:hide` → `shownItems` update); the **recorded init burst** from the
  Phase 0 spike (no spurious `tab_select` for initially active items, challenge 11); an event before the
  pageview gets `page()`-based defaults (challenge 3).

### Phase 4 — sending and lifecycle

> **Done 2026-10-16** (uncommitted). `lib/sender.js` (`create_sender`: the lifecycle as a factory without
> globals — `_jts`, page lookup, timer and `report` are passed in), wired in `index.js` (subscription →
> history cursor → sender). 20 tests (`tests/jentis-sender.test.js`: 15 on the sender, 5 on the whole plugin
> against a fake ACDL with replay); mutation check: 15 mutations, all caught. **374/374.**
> **Browser check** (Fraport tabs page, real ACDL 2.0.2, new build injected, `plugins.jentis` added to the
> site config by an init script): pageview + submit first; an event pushed before the library existed was
> held, sent after the pageview, and reported its **historical** title; tab switch → `tab_select`; click on
> the active tab → skipped (`already_shown`); `cmp:hide` not forwarded; rich-text link click → `link_click`,
> `link_type: internal`, `link_url` cut at `max_value_length`. **Golden master** without jentis configured
> (shipped 1.10.0 vs. Phase 4 build): data layer events, page node, tab switch, listener guard and console
> log identical. Other chunks byte-identical to Phase 3; the jentis chunk id changed `3` → `170` (webpack
> derives it from the chunk's modules) — Phase 7 takes the id from the release build.
>
> Decided while implementing: a pageview arriving **after** the timeout is still sent, once (events held
> until then were already flushed with the warning); an event the cursor cannot find in the array (another
> script rewrote it) uses ACDL's current state (`this.getState()`) — the best available; the timer is
> cancelled when the pageview is sent.

- `lib/sender.js`: `window._jts = window._jts || []`, then `_jts.push(doc)`; pageview as
  `{ track: "pageview", …props }` + `{ track: "submit" }`.
- Order: event documents are **held until the pageview** is sent; if no pageview arrives within
  `options.pageview_timeout` (default 5000 ms) they are flushed with a warning (no silent loss when the page
  plugin is misconfigured); the warning names the configured `pageview.on` (replaces the `<prefix>:page:*`
  mismatch heuristic, challenge 10). Pageview once per page. `pageview: false` → no pageview, events are
  not held.
- Listener via the core subscription (`context.acdl.subscribe`, `scope: "all"`, Phase 1 step 2b) — no own
  `setTimeout` for the registration (the pageview timeout is the only timer).
- Tests: queue without `_jts`, pageview-first ordering, timeout flush (warning names `on`), second pageview
  ignored, `pageview: false`.

### Phase 5 — logging

> **Done 2026-10-16** (uncommitted). `lib/log.js` (`create_log(logger, { enabled })`: sender reports → one
> line per event); the sender also reports `held` and `ignored` (not in `events`), the document builder the
> per-rule outcome of `no matching rule` (`#0 match, #1 skip`) and the truncated keys. Not muted by
> `log: false`: validation problems and the pageview timeout (misconfiguration, not a single event).
> 10 tests `tests/jentis-log.test.js`, sender/plugin/document tests extended; mutation check: 14 mutations,
> all caught. **388/388.** Browser (Fraport tabs page): log lines as in the plugin README, `_jts` identical
> to Phase 4; golden master without jentis identical to 1.10.0; other chunks byte-identical; jentis chunk id
> now `543`.

- Forwarded: `"<event> → <name>"` + the document; dropped: event + reason (`no node`, `no rule`,
  `rule false`, `skip`, `match`); validation errors from Phase 2. `options.log: false` → nothing.
- Tests via `make_logger`.

### Phase 6 — docs and delivery (repo process)

> **Done 2026-10-16** (not committed). Plugin README final, main README (plugin list, `dependencies` default,
> plugin-author context), `_template` and `CLAUDE.md` (context: `subscribe`, `helpers`, guarded listeners, init
> isolation), `CHANGELOG.md` 1.11.0, `package.json` 1.11.0, BACKLOG: jentis entry removed, 1.12.0 follow-up and
> the `catch().get()` bug (14) added. 388/388 on Node 20 and on Node 25.5.0 (`.nvmrc`). **Golden master on
> the library dev server** (config from the Adobe Tags property: `page`, `component`, `xdmtracker`,
> `clickables` + one more; 1.10.0 main bundle injected vs. new build, two runs each): data layer events, state,
> plugin namespaces, console log, the `xdmtracker` page view `sendEvent` (recorded `alloy()` calls) and a
> `clickables` link click identical. Not covered there: consent (Usercentrics does not load in headless
> Chrome). `npm run build:crxbundle` → `release/1.11.0/` + `crx-package/acdl_helper-1.11.0.zip`; release files
> = the build tested in the browser except the version string; existing chunks byte-identical to
> `release/1.10.0/`; **jentis chunk: `543.acdl_helper.js`.** Commit + push to both remotes: on Martin's go.

- `src/plugins/jentis/README.md` — exists since Phase 2 and grows **with every phase** (planned parts marked
  *planned*); linked from the main README plugin list. Phase 6: remove the in-development note, final
  review. `CHANGELOG.md` **1.11.0** (incl. the core fixes from Phase 0/1), `package.json` version, remove the
  BACKLOG line; fix the README `dependencies` default (challenge 16) and document `context.acdl.subscribe`
  and the core resolver for plugin authors (`_template`).
- Browser check on the dev server: a sample page with seeded components, the plugin with a test config and a
  `_jts` recorder; optionally scripted via headless Chrome.
- `npm run build:crxbundle` → `release/1.11.0/` + `crx-package/acdl_helper-1.11.0.zip`; commit and push to
  both remotes — when Martin says so.

### Phase 7 — Fraport integration (in the Fraport repo)

- Vendor `release/1.11.0/` (Martin copies the folder — shell rule), update `frontend/clientlib.config.js`
  and the profile. The Fraport clientlib lists the chunks explicitly
  (`bundles/core/src/main/webapp/clientlibs-root/acdl_helper/js.txt`) → add the jentis chunk with the id of
  the **release** build — **`543.acdl_helper.js` in 1.11.0** (the id changes with the chunk's modules).
- `AcdlHelper.ts`: `plugins.jentis` from `docs/tracking/jentis-mapping.md`, incl. `families` (the mapping's
  family table) and `partner_hosts` from the OSGi config `FraPartnerSitesConfiguration` (maintained per
  environment in CONGA), rendered by the page component as a data attribute and read by `AcdlHelper.ts`.
- Vitest spec for the Fraport configuration (rows of the mapping → expected documents).
- Browser check on the local instance: `acdl_helper.setDebug(true)`, click through the tested components,
  compare the logged documents with the mapping (the `this.getState` check moved to the Phase 0 spike).

### Effort (rough)

Phase 0: 1 day (incl. browser spike) · Phase 1: 1–1½ days (new core parts, no migration) · Phases 2–5:
2–3 days · Phase 6: ½–1 day · Phase 7: 1 day → **1.11.0: ~6–7 days.**

### Follow-up — 1.12.0 (after the first consumer's freeze)

Migrate the existing users onto the new core parts, each with characterization tests first:
`event_catcher` / `catch` (`get` always a function — challenge 14), `page` (matcher + resolver) and
`xdmtracker` (resolver, `subscribe`, drop the `$type` shim) — challenges 4, 5; `register_plugin_event_handler`
onto `subscribe` if the Phase 0 spike confirms the drop; then `context.shared` (13) and the `update_object`
copies (15, five places: core, `page`, `cleanup`, `user`, `usercentrics`).
