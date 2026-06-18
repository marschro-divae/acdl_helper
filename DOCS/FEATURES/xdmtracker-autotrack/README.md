# xdmtracker — `autoTrack` self-registered tracking

> **Status:** ✅ Implemented in **v1.9.0** (source; pending build + push)
> **Plugin:** [`src/plugins/xdmtracker`](../../../src/plugins/xdmtracker)
> **Builds on:** [config-time definitions (v1.8.0)](../xdmtracker-config-time-define/)
> **Type:** API enhancement (backward compatible)

---

## 1. Problem / motivation

After v1.8.0 the tracking definition can live in the plugin config, but **listening
for events and calling `track()` still has to be wired externally** — and that wiring
is fragile:

1. **Async-init timing race.** `acdl_helper(config)` initializes asynchronously, so
   `acdl_helper.xdmtracker` is not available synchronously afterward. External code
   that registers an `adobeDataLayer:event` listener and calls
   `acdl_helper.xdmtracker.track(...)` can fire **before the global API exists** — the
   ACDL replays already-queued events into the handler at registration time, throwing
   `Cannot read properties of undefined (reading 'track')`. The only external
   mitigations are ugly: poll until the API exists, or guard-and-drop early events
   (which loses the early prefetch event).
2. **Unreliable "all events" triggers.** At least one ACDL Launch extension's
   "all events" trigger fires only for the initial event burst and then stops, so
   later same-page interactions are silently lost. Working around it means a
   hand-written native listener — which then hits problem #1.
3. **One concern split across many places.** Defining the schema, listening, and
   sending are a single responsibility; splitting them across config + a listener
   registration + a track rule adds ordering assumptions and failure modes.

**The plugin is the only component that knows exactly when it is ready and holds both
the definition and the `track()` implementation.** So it is the correct owner of the
listener: registering from inside the plugin's own init uses the plugin's **internal**
track reference, eliminating the global-API timing race by construction.

## 2. Investigation — verified against the code (not the brief)

The original feature brief proposed normalizing each raw data-layer event to
`{ message: event }` before tracking. **Tracing the actual code shows that is
incomplete and would silently drop component-derived variables:**

- `track()` calls `context.catch(event)`. The core
  [`event_catcher.js`](../../../src/core/lib/event_catcher.js) only treats an event as
  a data-layer event when `event.$type` contains `"adobe-client-data-layer"`
  (`is_dl_event`). That `$type` field is added by **Adobe Launch**, *not* by the ACDL.
- A raw listener event (what `adobeDataLayer:event` delivers, as used by the `page`
  plugin's fulfiller and `handle_event`) carries `event.event` + `event.eventInfo` at
  the **top level** and has **no `$type`**.
- So `{ message: event }` alone → `catch()` returns nothing → `cmp` is `{}` → every
  resolver like `(cmp) => cmp.searchTerm` yields `undefined`. The page view may still
  send, but component-derived eVars/props would be blank.

**Correct normalization** — synthesize the marker the existing `catch()` contract
requires, localized to xdmtracker (no change to shared core):

```js
const handler = (acdl_event) =>
  track_impl({ message: acdl_event, $type: "adobe-client-data-layer:event" })
// message → track()'s event.message.event + catch()'s event.message.eventInfo.path
// $type   → makes event_catcher.is_dl_event() accept it, so cmp resolves
```

**Replay semantics (`scope: 'all'`)** — confirmed by precedent, not docs: the `page`
plugin already registers `add_event_listener("adobeDataLayer:event", …, { scope: "all" })`
([`page/index.js`](../../../src/plugins/page/index.js)) for its dependency fulfiller,
shipped since before v1.7.0. `scope: 'all'` replays past (queued) events and delivers
future ones, in chronological order — so the early prefetch and the page-load event are
both tracked, and the render-gate ordering (prefetch `renderDecisions` → page view
`includeRenderedPropositions`) is preserved.

### 2a. Live-event drop — the timing bug (found after first implementation)

The first cut registered the listener **synchronously inside `provider()`**. In a real
AEM Core Components page this tracked **only the init-burst (snapshot) events** — the
page view (`page` plugin's `setTimeout(0)` `acdl_helper:page:load`) and **every user
interaction** were silently dropped. The team's drop-in replacement — a native listener
registered **after** `acdl_helper.xdmtracker` exists — caught everything:

```js
// works: registered post-init, on the live data layer
window.adobeDataLayer.push(dl =>
  dl.addEventListener("adobeDataLayer:event", h, { scope: "all" }))
```

**Root cause = timing, not the handle.** `provider()` runs **mid-init, re-entrantly
inside acdl_helper's dependency-resolver ACDL dispatch** (the `autoTrack enabled` log
precedes `API now available`). A listener added during that active dispatch binds to the
replayed snapshot and then never receives later live pushes. The working replacement
differs in exactly one variable — it registers **after** init, in a clean macrotask, on
the idle data layer.

> ⚠️ A tempting-but-wrong diagnosis was "`context.acdl` is a snapshot object that
> doesn't subscribe live." Not mechanically true: `context.acdl.add_event_listener(t,h,o)`
> *is* `window.adobeDataLayer.push(dl => dl.addEventListener(t,h,o))` — the identical
> live subscription the working replacement uses. The handle is the same; only the
> **timing** differs.

**Could not reproduce in Node.** The real `@adobe/adobe-client-data-layer` was tested
across **v1.1.5, 2.0.0, 2.0.2, 3.0.0, 3.0.1**, faithfully mimicking the re-entrant
registration; in every version a `scope:"all"` listener still caught future events. So
the live-drop is specific to the AEM-shipped ACDL build/runtime and is **not** reproduced
by the standalone package. Per `CLAUDE.md` ("observed behavior wins"), the fix encodes
the in-project observation.

**Fix:** defer the registration to a **post-init macrotask** (`setTimeout 0`), on the
same live data layer (`context.acdl`), keeping `scope:"all"` so already-queued events
still replay. This makes autoTrack's registration equivalent to the proven replacement.

> **Validation note:** unit tests can only prove the registration is now deferred (and
> still tracks) — they cannot prove the live AEM ACDL now delivers live events, because
> Node's ACDL never dropped them. Final confirmation must be in the real page:
> `autoTrack: true` → page view + consecutive interactions all track.

## 3. The solution

Add `autoTrack: boolean` (default `false`) to the plugin config. When `true`, the
plugin:

1. loads the config-time definition during `provider()` setup (existing v1.8.0
   behavior), then
2. **schedules** (via `setTimeout 0`, see §2a) the registration of a **single**
   `adobeDataLayer:event` listener with `{ scope: 'all' }` via `context.acdl`, whose
   handler normalizes each event to `{ message, $type }` and calls the **internal**
   `track_impl`. The registration fires in the next macrotask — after init has fully
   unwound and the ACDL dispatch is idle — so the subscription receives live events.
   Events with no matching definition no-op (as today).

`track()` is refactored to delegate to `track_impl` — public behavior identical.

### Backward compatibility & guards
- `autoTrack` unset/`false` → unchanged: definitions still register, project drives
  tracking via `define()`/manual `track()` as before.
- Guard on `context.acdl` so unit tests that build the provider with a minimal context
  are unaffected.
- **Double-tracking:** with `autoTrack: true` the project must NOT also call `track()`
  manually or keep a track rule, or events fire twice. Documented.
- No infinite loop: `track()` sends to `alloy`; it never pushes back into the data layer.

## 4. Acceptance criteria

- [ ] `plugins.xdmtracker: { defaults, events, autoTrack: true }` with no other tracking
      wiring sends the early prefetch, the page view, **and** later interactions.
- [ ] No `Cannot read properties of undefined (reading 'track')`; no external poll/guard.
- [ ] Events queued before init are replayed and tracked (nothing dropped).
- [ ] A `cmp`-derived resolver resolves correctly under autoTrack (proves the `$type` fix).
- [ ] `autoTrack` defaults to false; omitting it preserves current behavior.
- [ ] Documented in `src/plugins/xdmtracker/README.md` (option, replay, double-track warning).

## 5. Relevant source

- [`src/plugins/xdmtracker/index.js`](../../../src/plugins/xdmtracker/index.js) — `provider()` setup (`load_definition`, new `track_impl`, autoTrack registration).
- [`src/core/lib/event_catcher.js`](../../../src/core/lib/event_catcher.js) — `is_dl_event` (`$type` contract).
- [`src/plugins/page/index.js`](../../../src/plugins/page/index.js) — precedent for `add_event_listener("adobeDataLayer:event", …, { scope: "all" })` and raw-event shape.
