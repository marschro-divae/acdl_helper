# Changelog

All notable changes to this project will be documented in this file.

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
