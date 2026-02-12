# Changelog

All notable changes to this project will be documented in this file.

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
