# xdmtracker — config-time tracking definitions

> **Status:** 🚧 In progress — targeting **v1.8.0**
> **Plugin:** [`src/plugins/xdmtracker`](../../../src/plugins/xdmtracker) (primary), [`src/plugins/page`](../../../src/plugins/page) (trigger of the symptom)
> **Type:** integration robustness / API enhancement (backward compatible)
> **Changelog:** see the `1.8.0` section of [`CHANGELOG.md`](../../../CHANGELOG.md)

---

## 1. Problem / motivation

When a project uses `xdmtracker` together with the `page` plugin, there is an
**initialization-ordering race**: the `page` plugin can emit its page-load event
*before* the consumer has called `xdmtracker.define(...)`, so the page view is
never tracked.

Reported symptom (standard Adobe Tags/Launch setup):

- **INIT rule** (`acdl_helper:loaded`): action A `acdl_helper(config)` (plugins
  include `xdmtracker: {}` and `page: {...}`), action B
  `acdl_helper.xdmtracker.define({...})`.
- **TRACK rule** (all data-layer events): `acdl_helper.xdmtracker.track(event)`.

Prefetch/other events track fine, but **no page view is sent**. Console order:

```
[acdl_plugin: page] – Page resolved. Pushing "load" event to the dataLayer   ← page:load pushed
[acdl_plugin: xdmtracker] – Tracking definition loaded                        ← define() runs AFTER
```

`track('acdl_helper:page:load')` runs while `xdmtracker._defined === false` → event dropped.

## 2. Root cause (verified against source)

1. `acdl_helper(config)` initializes **asynchronously** — `acdl_helper.xdmtracker`
   is not available synchronously after it returns, so consumers are forced to call
   `define()` in a *separate* Launch action.
2. The `page` plugin pushes its page-load event via `setTimeout(0)`
   ([`page/index.js`](../../../src/plugins/page/index.js) `handle_event`), a
   macrotask that can fire **before** the separate `define()` action runs.
3. `xdmtracker` had **no config-time definition path** — the only way to register a
   definition was the post-init `define()` method.

The definition state (`_definition` / `_defaults` / `_defined`) lives in the
**`provider()` closure** of [`xdmtracker/index.js`](../../../src/plugins/xdmtracker/index.js),
not in `init()`. In `plugin_utils.init_plugins`, `provider()` is invoked
**synchronously** as part of plugin init (step 6), and event handlers register
*afterward* (`register_plugin_event_handler`). So a definition applied during
`provider()` setup is guaranteed in place before any event — including the
`setTimeout(0)` page-load — can fire.

## 3. What didn't work (and why)

| Rejected / prior approach | Why it isn't the fix |
|---|---|
| **`page_load_dependencies: ["xdmtracker:ready"]`** + a marker event pushed right after `define()` | Works and is deterministic, but a hand-orchestrated workaround for a library-level gap. Every integrator must wire it. |
| **Put the logic in `init()`** (as the original brief suggested) | `init()` has **no access** to the provider-closure state (`_definition`/`_defined`). The correct home is `provider()`, which still runs synchronously during plugin init. |
| **Add a ready signal** (promise from `acdl_helper(config)` or an `acdl_helper:ready` event) | Useful for post-init code, but does **not** by itself fix the `setTimeout(0)` vs. action-ordering race. The config-time define does. **And it already exists** — the library pushes `<prefix>:dependencies_resolved` (`events.js`) the moment all plugin dependencies resolve and the API is assembled (`src/core/index.js`). So this was a documentation gap, not new code: the existing event is now documented as the post-init/ready signal. |

## 4. The solution

Let `xdmtracker` accept its tracking definition **in its plugin config**, so it is
registered during plugin init — atomically, before any plugin can emit an event:

```js
acdl_helper({
  plugins: {
    xdmtracker: { defaults: {...}, events: {...} },   // ← define at init
    page: { ... },
    component: {}
  }
});
```

### Implementation

- Extract the validation + store logic from `define()` into an internal
  `load_definition(config, source)`.
- In `provider(context)`, after the closure vars, if `context.config` carries
  `events` (and/or `defaults`), call `load_definition` immediately → `_defined`
  is `true` before any event fires.
- **Precedence:** `define()` keeps working unchanged. A later `define()`
  **overrides** a config-time definition (reusing the existing
  "already defined — overwriting" warning). `xdmtracker: {}` (empty) stays a no-op.

### Result for integrators

The integration collapses to **one INIT action** (`acdl_helper(config)` with
definitions inline) **+ one TRACK rule** (`xdmtracker.track(event)`). No separate
`define()` action, no `page_load_dependencies` gating, no marker event.

## 5. Acceptance criteria

- [ ] `plugins: { xdmtracker: { defaults, events } }` registers the definition during init.
- [ ] With config-time definitions, the `page` plugin's automatic page-load event is
      tracked correctly **without** `page_load_dependencies` or a separate `define()`.
- [ ] `track()` succeeds for config-defined events immediately after init.
- [ ] Existing `define()` API and `xdmtracker: {}` (empty) behavior unchanged.
- [ ] Behavior documented in `src/plugins/xdmtracker/README.md` (config-time vs. `define()`, precedence).

## 6. Relevant source

- [`src/plugins/xdmtracker/index.js`](../../../src/plugins/xdmtracker/index.js) — `provider()` (`define`/`track`, `_defined` guard).
- [`src/plugins/page/index.js`](../../../src/plugins/page/index.js) — page-load emit via `setTimeout(0)`; `page_load_dependencies` handling.
- [`src/core/lib/plugin_utils.js`](../../../src/core/lib/plugin_utils.js) — `init_plugins` (synchronous `init()` → `provider()` before event registration).
