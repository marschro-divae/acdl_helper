# Changelog

All notable changes to this project will be documented in this file.

## [1.11.1] - 2026-10-19

_Motivation: on the first consumer's local AEM (Fraport), JENTIS documents lagged one event behind whenever the same event repeated on the same node — `slider:autoplay` pause / play / pause reached `_jts` as pause / pause / play, and an accordion rule skipping closes forwarded every close as an open. Investigation and the rejected alternative: [`DOCS/FEATURES/jentis-bridge/` §7.6](DOCS/FEATURES/jentis-bridge/README.md)._

### Fixed

- **jentis: a repeated identical live event got the previous event's state.** ACDL 2.0.2 updates the state and calls the listeners *before* it appends the pushed item to `adobeDataLayer` (verified in its source and on the AEM page). The history cursor missed every live event (correctly falling back to `this.getState()`) but moved past the end, so the next event with the same `event` + `eventInfo` matched the previous item and was built from its state. A missed event now stays pending: its item is folded into the cursor state when it appears, never matched. Pending events are matched by content, so a nested push (a listener pushing during the dispatch, appended before the outer item) is handled too. Rules reading only static node data (`cmp:click` on links) were not affected.
- **Tests modelled the wrong order.** The history test for live events and the fake ACDL of the plugin tests appended the item before delivering it. New tests run the cursor and the whole plugin in the real ACDL order: repeated identical events, a `skip` on the event's own state, replay followed by live events, nested pushes. **397 tests.**

### Changed

- **ESLint runs again** (tooling only): ESLint 9 ignores `.eslintrc.json`, so linting had silently stopped. Replaced by a flat `eslint.config.js` with the same rules (`eslint:recommended` + `prettier`, browser globals; Node globals for `tests/` and build configs; `_`-prefixed arguments / caught errors and rest siblings may be unused), `@eslint/js` and `globals` as devDependencies, new script `npm run lint`. The three findings in shipped code are resolved without changing the built chunks: two unused names `_`-prefixed (renamed away by the minifier), one regex escape in `xdmtracker/lib/paths.js` kept verbatim with a disable comment.

### Backward compatibility

Fully backward compatible; no configuration or API change. Only the `jentis` chunk and the main bundle (version string) change.

## [1.11.0] - 2026-10-16

_Motivation: a site without Adobe Tags sends its tracking through **JENTIS**, a server-side tag manager whose only documented website input is `_jts.push({...})`. JENTIS cannot read the data layer's **state**, and a Core Components event such as `cmp:click` carries only `eventInfo.path` — title, URL and `@type` live in that state. A bridge has to resolve each event's node, decide what is reported and write JENTIS documents; and because it listens later than the page's first pushes, it must see each event's state **at the event**, not ACDL's current state. Requirements, decisions, review round and browser spikes: [`DOCS/FEATURES/jentis-bridge/`](DOCS/FEATURES/jentis-bridge/README.md). First consumer: Fraport travel._

### Added

- **New plugin `jentis`** — declarative rules per data layer event (`match`, `skip`, `group`, `name`, `value`, `interactive`, `numvalue`, flat `props`, `defaults.props`, `false` = never forwarded) → JENTIS documents in `window._jts`: `{ track: "pageview", … }` + `{ track: "submit" }` once per page, then `{ track: "event", … }`. **Pageview first:** events before it are held and sent right after it; after `options.pageview_timeout` (5000 ms) they are sent with a warning naming the configured `pageview.on`; `pageview: false` for sites that send the pageview elsewhere. **State at the event:** a history cursor folds the `adobeDataLayer` array up to each event (ACDL merge rules, verified in AEM), so replayed events see their own state, not later pushes. Helpers `h.page()`, `h.parent()`, `h.already_shown()` (a click on the active tab), `h.link_type()` (`partner_hosts`), `h.family()` (`families`), `h.matches()`, `h.truncate()`. **Destination-agnostic:** limits of what JENTIS feeds (`max_value_length`, `max_lengths`, `max_name_length`, `max_props`) are optional options, none by default. The config is validated at `init()` (every problem logged with its path, the valid rest runs); with debug mode on, one log line per event (forwarded → document, held, ignored, not forwarded + reason incl. why each rule did not apply, truncated keys, resolver problems); `options.log: false` mutes the per-event lines. Docs: [`src/plugins/jentis/README.md`](src/plugins/jentis/README.md).
- **Core helpers for plugins — `context.helpers`** (pure, no configuration of their own): `matches(node, test)` (the wildcard matcher of `page` / `catch`, never throws), `resolve_node(event, { get_state })` (the rules of `catch(event).get()` for raw and Launch-wrapped events, on a copy, never throws), `link_type(url, { partner_hosts })` and `family(cmp_or_type, families)`. Existing users move onto them in 1.12.0.
- **`context.acdl.subscribe(event, handler, options)`** — registers a listener **after** the current dispatch (a listener registered mid-init was observed to miss live events, see 1.9.1) and returns `unsubscribe()`, which also works before the registration ran.
- **Tests** — core: init isolation, listener guard, debug flag, matcher, resolver, link type (`tests/core-*.test.js`); jentis: validation, history cursor, document building from recorded AEM sequences, lifecycle and the whole plugin against a fake ACDL with replay, log (`tests/jentis-*.test.js`). **388 tests**, green on Node 20 and 25; each new module mutation-checked.

### Fixed

- **A throwing data layer listener broke the code that pushed.** ACDL 2.0.2 (verified in AEM) lets an exception in a listener escape `push()` to the caller (Core collector click handler, project services) and skips the later listeners for that event. Every listener registered through `context.acdl.add_event_listener` is now guarded: logged, never rethrown, `this` kept for `this.getState`, `remove_event_listener` still works with the original handler.
- **One failing plugin took the whole library down.** `init_plugins` ran inside the dependency-resolved ACDL dispatch without isolation: a plugin whose `impl()` / `init()` / `provider()` threw (or that lacked `impl` / `init`) left `window.acdl_helper` without its API and every other plugin dead. Each plugin is now initialised in isolation — logged and disabled, the rest comes up.
- **Loading the library could abort where `localStorage` throws** (sandboxed iframe, storage blocked by browser settings): the debug flag was read unguarded at module load. Now guarded; a `localStorage` without `getItem` counts as debug off.
- **README:** the default of `dependencies` is `[]` (it said `['launch:loaded']`); plugin authors' context (`subscribe`, `helpers`, guarded listeners, init isolation) documented in the README and `src/plugins/_template`.

### Changed

- **Explicit `.js` extensions on all relative imports** in core and plugins, so the core is importable by Node's test runner (webpack output unchanged).

### Backward compatibility

Fully backward compatible. Without `plugins.jentis` the library behaves as 1.10.0: every existing plugin chunk is byte-identical to `release/1.10.0/` — only the main bundle (the core fixes above + the new chunk in the chunk map) changed — and a golden master on a real AEM page (data layer events, page node, tab switch, listener guard, console log — shipped 1.10.0 vs. 1.11.0 injected) was identical. The jentis plugin is a new chunk; projects that list chunks explicitly (an AEM clientlib `js.txt`) must add it.

## [1.10.0] - 2026-08-27

_Motivation: a project must send its tracking to **two different Adobe Orgs** — Org A for classical Adobe Analytics, Org B for Customer Journey Analytics — and Adobe requires **one Web SDK instance per Org** (unique `orgId` **and** unique `datastreamId` each, or the instances collide on cookies). The plugin was hard-wired to `window.alloy`, so there was no way to express "send this event to that instance too, with a different payload". The data for the second Org is also shaped differently (tenant XDM field groups instead of AA eVars/props/events) and sometimes only a delta of the first — so per-Org definitions and delta support were both needed. Concept, rejected alternatives and reasoning: [`DOCS/FEATURES/xdmtracker-multi-org-targets/`](DOCS/FEATURES/xdmtracker-multi-org-targets/README.md)._

### Added

- **xdmtracker: multi-org sending via `targets`.** A **target** is a named destination — one Web SDK instance plus its own defaults and options — declared once in the plugin config: `plugins: { xdmtracker: { targets: { aa: { instance: "alloy" }, cja: { instance: "volkswagen", … } } } }`. One ACDL event then produces one `sendEvent` per target, each through its own named global. **Injection stays external**: the instances are declared in the Web SDK base code array and configured in the Web SDK tag extension (which supports multiple instances); the plugin only resolves `window[<instance>]` and sends — it does not load or configure alloy (no runtime dependency, and personalization keeps the extension's early load timing).
- **One new event key, `targets`** — per target either an **overlay object** or **`false`**. An overlay is a **delta** by default (the shared definition is inherited and the overlay adds/overrides per variable and per XDM path); `extends: false` makes it a **replacement** (the shared event body is dropped, so a differently-shaped CJA payload needs no duplication); `false` means **no `sendEvent` call at all** to that instance. An overlay never implies routing — adding a CJA field can never silently switch off Adobe Analytics for that event.
- **Target capabilities, declared once instead of per event** — `analytics: false` (never *inherit* `eVars`/`props`/`lists`/`events`, so no `_experience.analytics.*` is duplicated into a CJA datastream), `personalization: false` (never inherit `renderDecisions`/`personalization`; `fetchOnly` prefetches skipped), `useGlobalDefaults: false`, a per-target `defaults` layer, `optIn: true` (allowlist semantics for a curated/staged Org), `enabled: false` (kill switch), plus target-level `datastreamId`/`edgeConfigOverrides`. Capabilities filter the **inherited** layers only — what an overlay states explicitly is always honored, with a warning: the plugin declines to *infer*, it never overrides what was *written*.
- **Per-target render gates.** The prefetch→page-view render gate is now keyed by target: a render finishing on `window.alloy` never gates or releases a page view on `window.volkswagen`.
- **`lib/targets.js`** (new, pure) — `normalize_targets`, `validate_definition_targets` (unknown/malformed overlays reported once at definition-load time, not per `track()` call), `resolve_send_targets`, `resolve_target_def`.
- **Tests** — `tests/multi-org-targets.test.js`: fan-out, primary ordering, delta in both directions, per-target override, `extends: false` (+ the pageView-loss warning), target defaults layering, `false` exclusion asserted on the stub's **call count**, `optIn`, `enabled`, unknown/`null` overlay handling, all capabilities incl. the explicit-overlay-wins cases, target-level `datastreamId`, render-gate isolation and one-shot independence, missing-instance isolation, duplicate-instance warning, malformed-config fallback, and autoTrack fan-out. Plus `tests/single-instance-characterization.test.js`: **frozen** characterization of the v1.9.1 single-instance contract (complete `sendEvent` envelopes for page view / link click / `fetchOnly`, `track()`'s single-object return, `window.alloy` as the only global touched, resolvers evaluated exactly once, `init()` error).
- **Test coverage: 100% lines / 100% functions / 97.7% branches** across the plugin (`node --test --experimental-test-coverage`). Beyond the feature suites, this closed pre-existing gaps in the malformed-definition paths: all ten `event_path_for` 100-buckets and their boundaries (a typo in a bucket string would silently misfile events), object-form unknown event keys, unsupported event descriptors, non-object kv items, malformed `xdm` pairs, non-array/non-object early returns, `define()`'s three input validations, and a new `tests/paths.test.js` + `tests/targets.test.js` for the pure utilities. The 8 residual branches are `hasOwnProperty` guards and type guards in module-private functions — unreachable without prototype pollution or exporting internals purely for the metric.
- **Docs** — plugin `README.md` §08 "Multi-org — sending to several Adobe Orgs" (base code, targets, the five per-event shapes, layering, capabilities, reference tables, caveats) and a pointer in the main `README.md`.

### Fixed

- **`event_path_for("event0")` misfiled instead of rejecting.** `"event0"` matches `/^event(\d+)$/` but is not a valid Adobe Analytics event; it resolved to `_experience.analytics.event101to200.event0` because the lower bound lived *inside* the first bucket check (`n >= 1 && n <= 100`) — for `n = 0` that check failed and the `n <= 200` bucket then matched. The bound is now checked first, so sub-1 indices return `null` and `coerce_events_into_xdm` warns (`unknown event`) instead of writing a bogus XDM path. Pre-existing and latent — no valid config emits `event0`.
- **`events: ["event48="]` counted 0 instead of 1.** An event with an `=` but no value ("no value given") silently produced `{ value: 0 }`: `to_number_or()` only falls back when the number is not finite, and `Number("")` is `0`, which *is* finite, so the fallback was never reached. The empty form (and a whitespace-only one) now counts **1**, exactly like the bare `"event48"`. An **explicit** `"event48=0"` — and the object form `{ event48: 0 }` — still yield `0`. Pre-existing since the AA mapping was introduced; only reachable from a malformed definition, which is why no report was affected.
- **`normalize_targets` logged a spurious error for a plugin with no config.** `config && config.targets` evaluates to `null` (not `undefined`) when `config` itself is null, which tripped the "config.targets must be an object" error path. Now the key is only read from an actual config object. Found by adding direct unit tests for the module.

### Changed

- **xdmtracker `track()`** — fans out over the resolved targets. With `targets` configured it returns a **map keyed by target** (`{ aa: payload, cja: payload }`, `{}` when no target receives the event); **without** `targets` it returns the single payload object exactly as before.
- **`build_payload`** — its 5th parameter now also accepts an **array of ordered XDM layers** (global defaults → target defaults → shared event body → overlay). The legacy single-`defaults`-object form is normalized internally, so existing callers and unit tests are unaffected.
- **`init()`** — checks **every** configured instance and logs one error per missing global, naming the target key and the expected global (a name absent from the base code array is the likeliest integration mistake). The single-target message is unchanged.
- **Logging** — payload logs are tagged with the target key (`[cja] prepared payload`) when targets are configured; untagged in single-target mode.

### Backward compatibility

Fully backward compatible: with no `targets` in the plugin config the plugin behaves **byte-identically** to 1.9.1 — one implicit `alloy` target, one payload, unchanged `track()` return value, unchanged `define()`/config-time definition shape, unchanged `autoTrack`. Multi-target is the *n* > 1 case of the same code path, so there are not two behaviors to drift apart, and the frozen characterization suite fails CI if the single-org contract breaks.

## [1.9.1] - 2026-06-18

### Fixed

- **xdmtracker: `autoTrack` dropped all live events.** As first shipped in 1.9.0, autoTrack registered its `adobeDataLayer:event` listener **synchronously inside `provider()`**, which runs mid-init — re-entrantly inside acdl_helper's dependency-resolver ACDL dispatch (the `autoTrack enabled` log precedes `API now available`). In the live AEM Core Components ACDL that listener bound only to the **replayed snapshot** and then never fired for later pushes: only the init-burst events tracked, while the page view (`page` plugin's `setTimeout(0)` `acdl_helper:page:load`) and **every user interaction** were silently dropped. Root cause is **timing, not the handle** — `context.acdl.add_event_listener(t,h,o)` is verbatim `window.adobeDataLayer.push(dl => dl.addEventListener(t,h,o))`, the same live subscription as the proven consumer workaround, which differs only by registering **after** init. Fix: defer the registration to a **post-init macrotask** (`setTimeout 0`) on the idle live data layer, keeping `scope:"all"` so already-queued events still replay. A new test locks the deferral so a regression to mid-init registration fails CI. (Standalone `@adobe/adobe-client-data-layer` v1.1.5–v3.0.1 did not reproduce the live-drop in Node, so this encodes observed AEM behavior — "observed behavior wins".)

> **Note on the bump:** 1.9.0 was never released externally, but the same-version artifacts were cached (AEM clientlib / browser) and served the stale pre-fix chunk during testing — confirmed by the old `autoTrack enabled — tracking all defined…` log line. 1.9.1 gives the fixed bundle a fresh, cache-busting path.

## [1.9.0] - 2026-06-18

_Motivation: after 1.8.0 the tracking definition can live in the plugin config, but listening for events and calling `track()` still had to be wired externally — a fragile setup. Because `acdl_helper(config)` initializes asynchronously, external code that listens and calls `acdl_helper.xdmtracker.track(...)` can run before the global API exists (the ACDL replays queued events at registration time), throwing `Cannot read properties of undefined (reading 'track')`; and some Launch "all events" triggers stop firing after the initial burst, silently losing interactions. This release lets the plugin own the listener so a project needs nothing beyond `acdl_helper(config)`._

### Added

- **xdmtracker: `autoTrack` config flag** — when `plugins.xdmtracker.autoTrack: true`, the plugin registers its own data-layer listener (`adobeDataLayer:event`, `scope: "all"`) and tracks every event whose name matches the definition. No separate track rule, no manual listener, no readiness workaround. `scope: "all"` replays events already queued before registration (e.g. an early personalization prefetch and the page-load event) and delivers all later interactions, in order, so the render gate (prefetch → unified page view) still holds. The listener calls the plugin's **internal** tracker, so it never depends on the global `acdl_helper.xdmtracker` API existing yet. Default `false`; existing setups are unchanged. The plugin wraps each raw listener event as `{ message, $type }` so the core `catch()` (which requires a `$type` containing `"adobe-client-data-layer"`, normally added only by Adobe Launch) resolves component state — otherwise component-derived eVars/props would be blank. _(Live-event delivery fixed in 1.9.1 — see below.)_
- **Tests** — autoTrack registers a single `scope:"all"` listener; emitted events are tracked; component-derived resolvers resolve (proving the `$type` wrapping); `autoTrack` unset registers no listener; the render gate holds across a replayed prefetch → page view; autoTrack also tracks definitions supplied via a later `define()` (`tests/autotrack.test.js`).
- **README (xdmtracker): "autoTrack — self-registered tracking"** — the config flag, replay behavior, and the double-track warning.

### Changed

- **xdmtracker `track()`** — refactored to delegate to an internal `track_impl()` shared with the autoTrack listener. Public behavior unchanged.

## [1.8.0] - 2026-06-18

_Motivation: when a project uses `xdmtracker` together with the `page` plugin, an initialization-ordering race could drop the page view. `acdl_helper(config)` initializes asynchronously, so integrators had to call `xdmtracker.define(...)` from a separate Adobe Tags action — and the `page` plugin emits its page-load event on a `setTimeout(0)` macrotask that can fire **before** that separate `define()` runs, so `track('…:page:load')` ran while the tracker was undefined and the event was dropped. The only workaround was hand-gating `page:load` via `page_load_dependencies` plus a marker event. This release lets the tracking definition be registered at init time, removing the race for all event sources._

### Added

- **xdmtracker: config-time tracking definitions** — the tracking definition can now be supplied in the plugin config: `plugins: { xdmtracker: { events, defaults } }`. It is registered during plugin init (in `provider()` setup, which runs synchronously in `init_plugins` before any plugin event handler is registered), so `track()` works immediately and the `page` plugin's automatic page-load event is captured **without** `page_load_dependencies` gating or a separate `define()` action. Resolver functions work as usual (the definition is inline JavaScript); a config-time definition is intentionally **not** remote-config-overridable. Backward compatible: `define()` is unchanged and `xdmtracker: {}` (empty) remains a no-op.
- **Tests** — characterization tests for the existing `define()`/`track()` guard, plus coverage for config-time `events`/`defaults`, resolver execution, override precedence, and validation (`tests/config-define.test.js`).
- **README (xdmtracker): "Registering the definition: config-time vs. `define()`"** — documents the two registration paths, precedence (a later `define()` overrides config), the no-remote-override caveat, and the existing `…:dependencies_resolved` data-layer event as the post-init/ready signal.

### Changed

- **xdmtracker `define()`** — refactored to share an internal `load_definition()` with the config-time path. Behavior unchanged; log/error wording now indicates whether a definition came from plugin config or `define()`.

## [1.7.0] - 2026-06-16

_Motivation: on personalized pages, `renderDecisions:true` made the Web SDK send a second `interact` call (the display notification). Because Adobe Analytics classifies any event carrying `web.webPageDetails` as a page view — and the SDK auto-collects the page URL on every event — that second call was counted as a **second page view**, inflating Page Views and deflating Bounce Rate / Single Page Visits. This release lets xdmtracker implement Adobe's prefetch + page-view pattern so a personalized visit produces exactly one page view while keeping A4T/Target attribution._

### Added

- **xdmtracker: `fetchOnly` definition flag** — a personalization prefetch that fetches/renders decisions without being recorded by Adobe Analytics. Defaults `eventType` to `decisioning.propositionFetch` and, because eventType alone does **not** reliably stop an AA hit, automatically disables the Adobe Analytics service for that event via `edgeConfigOverrides.com_adobe_analytics.enabled = false`. Target and AEP still receive the event. It also skips the merged `defaults`, so the prefetch payload stays minimal (no AA eVars/props) and isn't mistaken for a page view when inspecting collect calls.
- **xdmtracker: `personalization` passthrough** — the full `personalization` object is forwarded to `alloy("sendEvent")` (e.g. `sendDisplayEvent`, `includeRenderedPropositions`, `decisionScopes`, `surfaces`), at definition or `send_opts` level.
- **xdmtracker: `edgeConfigOverrides` passthrough** — per-event datastream overrides, merged with `datastreamId` and `fetchOnly`'s auto-suppression.
- **xdmtracker: render gate** — an event that renders decisions captures its alloy promise; a later event using `personalization.includeRenderedPropositions` is deferred until that render settles, so the rendered propositions fold into the single page-view hit. A `gateTimeout` (default `2000` ms, overridable per event) guarantees the page view always fires and never hangs. Driven purely by flags, not event names.
- **Test suite (`node:test`, zero new dependencies)** — first automated tests in the project. Characterization tests lock existing `build_payload` / xdm-builder / aa-mapping / resolve behavior, plus coverage for the new `fetchOnly`, `personalization`, `edgeConfigOverrides`, and render-gate logic. Run with `npm test`.
- **README (xdmtracker): §06 "Personalization & display events"** — the prefetch + page-view recipe, decision scopes, the `__view__`-only auto-render limitation, and the founded page-view-vs-link mechanism (`web.webPageDetails` decides, not `eventType`).

### Changed

- **xdmtracker `track()`** — the alloy send may now happen **asynchronously** when the render gate defers an event (the method still returns the built payload synchronously for debugging).

## [1.6.0] - 2026-02-12

### Added

- **New plugin: xdmtracker** — transforms declarative tracking definitions into Adobe XDM payloads and sends them via `alloy("sendEvent", ...)`
  - `define({ events, defaults? })` — load a tracking definition with optional default variables
  - `track(event, send_opts?)` — pass an ACDL event; the plugin auto-resolves the event name and component state
  - Defaults: base variables (eVars, props, events, etc.) merged into every sendEvent, event definitions overlay their delta on top
  - Modular architecture: `paths.js`, `resolve.js`, `aa-mapping.js`, `xdm-builder.js`, `payload.js`
- **Plugin context: `catch`** — the core `catch(event).get()` function is now available to all plugins via `context.catch`
- **Debug mode: `setDebug(true|false)`** — runtime toggle replaces the old `env` config key. Persists to `localStorage`, takes effect immediately for all loggers (core + plugins)
- **README: table of contents** — clickable index at the top for quick navigation
- **README: code conventions section** — documents the snake_case convention

### Removed

- **`env` config key** — replaced by `acdl_helper.setDebug(true|false)`. The `"development"` / `"production"` string matching is gone

## [1.5.2]

### Fixed

- Resolve path and reference handling in event catcher

## [1.5.1]

### Fixed

- Counter fix

## [1.5.0]

### Added

- Improved error messages and logging
- Releases folder for CDN access via jsdelivr

### Fixed

- Typos in documentation

## [1.4.0]

### Added

- Plugin page: configurable UTM to CID parsing

## [1.3.2]

### Fixed

- Bugfix in page plugin

## [1.3.0]

### Added

- Clickables plugin: support for `target="_blank"` links
