# Changelog

All notable changes to this project will be documented in this file.

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
