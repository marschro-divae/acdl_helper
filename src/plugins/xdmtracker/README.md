# Plugin - xdmtracker

## Table of Contents

1. [Description](#01-description)
2. [API](#02-api)
   - [Registering the definition: config-time vs. define()](#registering-the-definition-config-time-vs-define)
   - [define(config)](#defineconfig)
   - [track(event, send_opts?)](#trackevent-send_opts)
3. [Defaults](#03-defaults)
4. [Definition fields vs. send options](#04-definition-fields-vs-send-options)
   - [XDM mapping reference](#xdm-mapping-reference)
   - [Definition fields](#definition-fields)
   - [Send options](#send-options)
5. [Page view vs. link click vs. fetch](#05-page-view-vs-link-click-vs-fetch)
6. [Personalization & display events](#06-personalization--display-events)
7. [Custom XDM fields](#07-custom-xdm-fields)
8. [Module structure](#08-module-structure)

---

## 01 Description

Transforms declarative tracking definitions into Adobe XDM payloads and sends them via `alloy("sendEvent", ...)`.

Define your tracking events once as a configuration object (keyed by ACDL event name), then pass the ACDL event to `track()`. The plugin automatically resolves the event name for the definition lookup and extracts the affected component's state for resolver functions.

- `name`: xdmtracker
- `dependencies`: []
- `events`: []

## 02 API

### Registering the definition: config-time vs. `define()`

The tracking definition (`{ events, defaults? }`) can be registered **two ways**. They take the same shape — pick whichever fits your setup.

**1. At init, via the plugin config (recommended):**

```javascript
acdl_helper({
  plugins: {
    xdmtracker: { defaults: {...}, events: {...} },   // ← registered during plugin init
    page: { ... },
    component: {},
  },
})
```

The definition is applied while the plugin initializes — **before any plugin can emit an event**. This avoids an initialization-ordering race: the `page` plugin emits its page-load event on a `setTimeout(0)`, which can otherwise fire before a separately-triggered `define()` runs, so the page view is dropped. With a config-time definition the tracker is always ready in time, so you need **no** `page_load_dependencies` gating and **no** separate `define()` action — just one init call plus your `track()` rule.

> Because the definition lives in your `acdl_helper({...})` call (real JavaScript), its **resolver functions work normally**. Note this also means a config-time definition is **not** remote-config-overridable — by design; a tracking schema is code, not remote JSON settings.

**2. At runtime, via [`define()`](#defineconfig):**

Use this when the schema isn't known at init, or to **replace** a definition later. A `define()` call **overrides** a config-time definition (and logs an `already defined — overwriting` warning). Because `acdl_helper(config)` initializes asynchronously, `acdl_helper.xdmtracker` is not available synchronously after it returns — call `define()` from a later rule/action, or in response to the library's `…:dependencies_resolved` data-layer event (pushed once all plugin dependencies resolve and the API is assembled).

> **Precedence:** config-time definition is applied first; a later `define()` replaces it wholesale (events + defaults). `xdmtracker: {}` (empty) registers nothing and behaves exactly as before.

### `define(config)`

Load a tracking definition with optional defaults. Optional if the definition is supplied via plugin config (above); otherwise call it once after the library is initialized.

```javascript
acdl_helper.xdmtracker.define({
  defaults: {                                      // optional — base variables for every sendEvent
    eVars: [
      { eVar1: () => document.location.href },
      { eVar2: () => acdl_helper.page.get("dc:title") },
    ],
  },
  events: {                                        // required — map of ACDL event names to tracking descriptors
    "my-app:page-load": {
      pageView: true,                              // → eventType defaults to "web.webpagedetails.pageViews"
      events: ["event1"],
      eVars: [
        { eVar11: "my-app:page-load" },
        { eVar20: (cmp) => cmp["dc:title"] },
      ],
    },
    "my-app:search:error": {
      // pageView omitted → link click            // → eventType defaults to "web.webInteraction.linkClicks"
      events: ["event2"],
      eVars: [
        { eVar11: "my-app:search:error" },
        { eVar20: (cmp) => cmp.searchTerm },
      ],
    },
    "my-app:order:complete": {
      eventType: "commerce.purchases",             // → explicit eventType, no pageView → link click semantics
      events: ["event3"],
      eVars: [
        { eVar11: "my-app:order:complete" },
        { eVar20: (cmp) => cmp.orderId },
      ],
    },
  },
})
```

> **Note:** `eventType` is optional. If omitted, it defaults automatically based on the `pageView` / `fetchOnly` flags:
> `pageView: true` → `"web.webpagedetails.pageViews"` | `fetchOnly: true` → `"decisioning.propositionFetch"` | otherwise → `"web.webInteraction.linkClicks"`

### `track(event, send_opts?)`

Pass the ACDL event (from an Adobe Data Collection rule). The plugin:

1. Reads `event.message.event` to look up the matching definition
2. Extracts the component state via `catch(event).get()` using `event.message.eventInfo.path`
3. Runs resolver functions with the component state (`cmp`)
4. Builds the XDM payload and sends it via `alloy("sendEvent", ...)`

```javascript
// In an Adobe Data Collection rule action (custom code):
acdl_helper.xdmtracker.track(event)

// With send options (defaults for all events in this call)
acdl_helper.xdmtracker.track(event, {
  documentUnloading: true,
})
```

## 03 Defaults

The `defaults` object defines base variables that are merged into every `sendEvent` payload. Event definitions then overlay their delta on top — if both set the same variable, the event definition wins.

Defaults support the same XDM-building fields as event definitions: `eVars`, `props`, `lists`, `events`, `xdm`, `xdmPairs`. Event-specific fields (`pageView`, `fetchOnly`, `eventType`, `webInteractionName`, `webInteractionType`) and send options (`renderDecisions`, `personalization`, etc.) are NOT supported in defaults.

**Merge order:** defaults first → event definition on top

```javascript
acdl_helper.xdmtracker.define({
  defaults: {
    eVars: [
      { eVar1: () => document.location.href },
      { eVar2: () => acdl_helper.page.get("dc:title") },
      { eVar3: () => acdl_helper.user.get("loginState") },
    ],
  },
  events: {
    "my-app:page-load": {
      pageView: true,
      events: ["event1"],
      eVars: [
        { eVar11: "my-app:page-load" },
        { eVar1: "homepage" },                     // overrides the default eVar1 for this event
      ],
    },
    "my-app:button-click": {
      events: ["event2"],
      eVars: [{ eVar11: "my-app:button-click" }], // eVar1, eVar2, eVar3 come from defaults
    },
  },
})
```

Resolver functions in defaults are re-evaluated on every `track()` call — important for SPAs where URL or page title may change. The `cmp` parameter is passed but can be ignored; defaults typically read from the DOM or other plugins instead.

## 04 Definition fields vs. send options

The plugin separates concerns into two layers:

**Definition fields** describe WHAT to track — always set per-event in the definition.
**Send options** control HOW to send — can be set in the definition (per-event) or in `send_opts` (call-level defaults). Definition-level overrides `send_opts`.

### XDM mapping reference

Where each field lands in the `alloy("sendEvent", payload)` call:

| Field | Lands in | What it does |
|-------|----------|-------------|
| `pageView` | controls XDM web structure | `true` → `web.webPageDetails.pageViews`, `false` → `web.webInteraction` |
| `fetchOnly` | controls XDM web structure + `payload.edgeConfigOverrides` | `true` → personalization prefetch: defaults `eventType` to `decisioning.propositionFetch` **and** auto-disables the Adobe Analytics service for this event (`com_adobe_analytics.enabled = false`) so it is not recorded as a page view |
| `eventType` | `payload.type` → alloy maps to `xdm.eventType` | Classifies the event (e.g. `"web.webpagedetails.pageViews"`, `"commerce.purchases"`) |
| `webInteractionName` | `xdm.web.webInteraction.name` | Link name in AA reports — maps to `s.tl(this, 'o', 'THIS VALUE')`. Defaults to event key |
| `webInteractionType` | `xdm.web.webInteraction.type` | Link click type — maps to `s.tl(this, 'o'\|'d'\|'e', ...)` |
| `events` | `xdm._experience.analytics.event1to100...` | AA event counters, mapped to XDM bucket paths |
| `eVars` | `xdm._experience.analytics.customDimensions.eVars` | AA conversion variables |
| `props` | `xdm._experience.analytics.customDimensions.props` | AA traffic variables |
| `lists` | `xdm._experience.analytics.customDimensions.lists` | AA list variables |
| `renderDecisions` | `payload.renderDecisions` | Tells Adobe Target/Personalization to auto-render decisions |
| `documentUnloading` | `payload.documentUnloading` | Uses `navigator.sendBeacon` instead of fetch — critical for clicks that navigate away |
| `datastreamId` | `payload.edgeConfigOverrides.datastreamId` | Routes the event to a different datastream than the alloy instance default |
| `edgeConfigOverrides` | `payload.edgeConfigOverrides` (merged) | Per-event [datastream overrides](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/datastream-overrides), e.g. `{ com_adobe_analytics: { enabled: false } }`. Merged with `datastreamId` and `fetchOnly`'s auto-suppression |
| `data` | `payload.data` | Non-XDM data passthrough (e.g. for data element mappings in server-side rules) |
| `personalization` | `payload.personalization` | Personalization options passed straight to alloy, e.g. `{ sendDisplayEvent: false }`, `{ includeRenderedPropositions: true }` (see [§06](#06-personalization--display-events)) |
| `gateTimeout` | render gate only | Max ms a page view waits for a prior render before sending anyway (default `2000`) |

### Definition fields

| Field      | Type    | Default | Description |
|------------|---------|---------|-------------|
| `pageView` | Boolean | `false` | `true` = page view (`s.t()`), sets `webPageDetails.pageViews.value = 1`. Omit or `false` = link click (`s.tl()`) |
| `fetchOnly` | Boolean | `false` | `true` = personalization prefetch: defaults `eventType` to `decisioning.propositionFetch` **and** auto-disables Adobe Analytics for this event so it isn't counted as a page view. See [§06](#06-personalization--display-events) |
| `eventType` | String | auto | XDM event type (e.g. `"web.webpagedetails.pageViews"`, `"commerce.purchases"`). Defaults based on `pageView` / `fetchOnly` flags |
| `webInteractionName` | String | event key | Link click only: the name shown in AA reports. Defaults to the ACDL event name |
| `webInteractionType` | String | `"other"` | Link click only: `"other"`, `"download"`, or `"exit"` |
| `events`   | Array   | — | AA events: `"event48"`, `"event48=22"`, `{ event48: 3 }`, or `(cmp) => ...` |
| `eVars`    | Array   | — | `[{ eVar4: "static" }, { eVar5: (cmp) => cmp.x }]` |
| `props`    | Array   | — | Same format as eVars |
| `lists`    | Array   | — | XDM list format: `[{ list1: { list: [{ value: "a" }, { value: "b" }] } }]` (see below) |
| `xdm`      | Object or Array | — | Object for deep merge, or pairs `[["path", value], ...]` |
| `xdmPairs` | Array   | — | Additional `[["path", value], ...]` pairs merged after `xdm` |

All values can be static or resolver functions `(cmp) => value`.

> **List variables** use a nested XDM structure unlike eVars/props. Each list value must be wrapped as `{ value: "..." }` inside a `list` array. Delimiters are not needed — Adobe applies the delimiter configured in the report suite automatically. See [list variable implementation](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list) for details.
>
> ```javascript
> // Static values
> lists: [
>   { list1: { list: [{ value: "red" }, { value: "blue" }, { value: "green" }] } },
> ]
>
> // Dynamic from component state
> lists: [
>   { list1: (cmp) => ({ list: cmp.tags.map((t) => ({ value: t })) }) },
> ]
> ```

### Send options

Configurable at both definition level (per-event override) and `send_opts` level (call-level default).

**Precedence:** `def.X` → `send_opts.X` → hardcoded default

| Option | Default | Description |
|--------|---------|-------------|
| `renderDecisions` | `false` | Auto-render Adobe Target/Personalization decisions |
| `documentUnloading` | `false` | Use `navigator.sendBeacon` for page-exit tracking |
| `datastreamId` | `null` | Override the alloy instance's default datastream |
| `data` | `null` | Non-XDM data passthrough |
| `edgeConfigOverrides` | `null` | Per-event [datastream overrides](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/commands/datastream-overrides), merged with `datastreamId` and `fetchOnly`'s auto-suppression |
| `personalization` | `null` | Personalization options passed to alloy (e.g. `sendDisplayEvent`, `includeRenderedPropositions`) — see [§06](#06-personalization--display-events) |
| `gateTimeout` | `2000` | Render-gate safety timeout (ms) — see [§06](#06-personalization--display-events) |

```javascript
const definition = {
  "page:load": {
    pageView: true,
    events: ["event1"],
    renderDecisions: true,              // ← per-event: this page view triggers Target
  },
  "form:submit": {
    events: ["event2"],
    documentUnloading: true,            // ← per-event: use sendBeacon because form navigates away
  },
  "link:click": {
    events: ["event3"],
    // no send options → inherits from send_opts or hardcoded defaults
  },
}

// call-level defaults
acdl_helper.xdmtracker.track(event, {
  renderDecisions: false,               // default for all events in this call
})
// → page:load gets renderDecisions: true (definition wins)
// → link:click gets renderDecisions: false (from send_opts)
```

## 05 Page view vs. link click vs. fetch

The `pageView` / `fetchOnly` flags control which XDM web fields are auto-populated. **Important:** Adobe Analytics decides page view vs. link from the presence of `web.webPageDetails` vs. `web.webInteraction.type` — **not** from `eventType` ([Edge Network event types in Adobe Analytics](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/hit-types)). That is why these flags, not `eventType`, govern how a hit is counted.

| flag | XDM fields set | `eventType` default | Equivalent |
|---|---|---|---|
| `pageView: true` | `web.webPageDetails.pageViews.value = 1` | `"web.webpagedetails.pageViews"` | `s.t()` |
| neither (default) | `web.webInteraction.name`, `.type`, `.linkClicks.value = 1` | `"web.webInteraction.linkClicks"` | `s.tl()` |
| `fetchOnly: true` | *(none in our payload; SDK still auto-adds `webPageDetails.URL`)* | `"decisioning.propositionFetch"` | personalization prefetch — **suppressed from AA** via `edgeConfigOverrides` (see §06) |

```javascript
const definition = {
  "my-app:page-load": {
    pageView: true,
    events: ["event1"],
    eVars: [{ eVar11: "my-app:page-load" }],
  },
  "my-app:button-click": {
    // pageView omitted → link click (default)
    webInteractionType: "other",
    events: ["event2"],
    eVars: [{ eVar11: "my-app:button-click" }],
  },
  "my-app:download": {
    webInteractionType: "download",
    webInteractionName: "PDF Download",
    events: ["event3"],
    eVars: [{ eVar11: "my-app:download" }],
  },
}
```

## 06 Personalization & display events

When you render personalization with `renderDecisions: true`, the Web SDK (by default, `sendDisplayEvent: true`) fires a **second** `interact` call — the display notification (`decisioning.propositionDisplay`). That second call carries an auto-collected `web.webPageDetails.URL` and no `web.webInteraction.type`, so **Adobe Analytics counts it as a second page view** ([hit-types rule](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/hit-types)) — inflating Page Views and deflating Bounce Rate and Single Page Visits.

The fix is Adobe's [top/bottom-of-page pattern](https://experienceleague.adobe.com/en/docs/experience-platform/collection/use-cases/personalization/display-events), expressed here as two events:

1. **Prefetch event** — render personalization early, suppressed from Adobe Analytics, with the display event suppressed:
   `fetchOnly: true`, `renderDecisions: true`, `personalization: { sendDisplayEvent: false }`.
2. **Page-view event** — your normal page view, folding the suppressed display notification into that single hit:
   `pageView: true`, `personalization: { includeRenderedPropositions: true }`.

The result on a single-page visit is **one** Adobe Analytics page view that also carries the A4T/Target attribution — no double counting, personalization reporting intact.

> **How the prefetch is kept out of Adobe Analytics (important):** Adobe Analytics decides what is a page view purely from `web.webPageDetails` ([hit-types rule](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/hit-types)) — **not** from `eventType`. The Web SDK auto-collects `web.webPageDetails.URL` on every event, so the prefetch *would* be counted as a second page view, and the `decisioning.propositionFetch` type does **not** reliably make AA drop it (verified in practice — it was still recorded). Therefore `fetchOnly: true` automatically adds `edgeConfigOverrides: { com_adobe_analytics: { enabled: false } }`, which deterministically tells the Edge to skip the Adobe Analytics service for that event. Target and AEP still receive it; only Adobe Analytics is bypassed. You can override this by setting `com_adobe_analytics` yourself in the event's `edgeConfigOverrides`.
>
> `fetchOnly` events also **skip the merged `defaults`**, so the prefetch payload stays minimal (no AA eVars/props) — handy when inspecting collect calls, so it's not confused with the page view. Note the Web SDK still auto-collects `web.webPageDetails.URL` via context collection (a global `configure({ context })` setting, not per-event), so the prefetch carries a URL but no `pageViews.value` — the absence of `pageViews.value` and the disabled-AA override are what mark it as a fetch, not a page view.

> **Generic by design:** the plugin keys on these flags, **never on event names**. Use whatever your project's earliest reliable event is for the prefetch (`app:load`, `site:init`, `dom:ready`, …) and your usual page-view event for the page view.

```javascript
acdl_helper.xdmtracker.define({
  defaults,
  events: {
    // 1. earliest reliable event → render personalization, kept out of Adobe
    //    Analytics (fetchOnly auto-disables AA), standalone display suppressed
    "app:load": {
      fetchOnly: true,
      renderDecisions: true,
      personalization: { sendDisplayEvent: false },
    },
    // 2. the page view → folds the display notification into this single hit
    "acdl_helper:page:load": {
      pageView: true,
      personalization: { includeRenderedPropositions: true },
    },
  },
})
```

### Render gate (automatic ordering)

`includeRenderedPropositions` can only fold in propositions that have already rendered. The plugin handles this automatically: when an event renders decisions (`renderDecisions: true`), its alloy promise is captured; the next event whose definition sets `personalization.includeRenderedPropositions: true` is **deferred until that render settles**, then sent.

- It is driven purely by the flags above — order is temporal (whichever event renders first), not name-based.
- It **never hangs**: a `gateTimeout` (default `2000` ms) always fires the page view even if the render stalls, and the underlying alloy promise resolves even when there is nothing to personalize.
- One-shot: each render gate is consumed by the first awaiting page view.
- No prefetch in play? An `includeRenderedPropositions` event with no pending render just sends immediately.

> **Consent fallback:** when personalization is not active (e.g. no consent), simply keep a single `pageView: true, renderDecisions: true` (or no `renderDecisions` at all) page-view event — no prefetch, no gate, behavior unchanged.

### Requesting decision scopes

The entire `personalization` object is passed straight to `alloy("sendEvent")`, so you can request named decision scopes or surfaces alongside the global `__view__` scope:

```javascript
"app:load": {
  fetchOnly: true,
  renderDecisions: true,
  personalization: {
    sendDisplayEvent: false,
    decisionScopes: ["home-hero", "promo-banner"], // named scopes (≈ named mboxes)
    // surfaces: ["web://example.com/path"],        // AJO / SPA surfaces
  },
},
```

> **Scope mapping (Target):** the at.js global mbox `target-global-mbox` maps to the Web SDK `__view__` scope; a *named* mbox maps to a decision scope of the same name.

> **⚠️ Auto-render limitation (sharp edge):** `renderDecisions: true` always requests **and auto-renders** the global `__view__` scope (Target VEC / global-mbox, form-based DOM actions). That is the only scope the Web SDK auto-renders, and it is the path the prefetch + `includeRenderedPropositions` fold-in fully automates.
>
> **Named scopes and surfaces are returned in the response but are NOT auto-rendered** — you must render them yourself (`applyPropositions` or custom DOM code) and send their display notifications manually. The plugin does not currently surface that response (`track()` returns the built payload, not the alloy promise), so xdmtracker fully automates **only** the `__view__` case. Rendering named scopes would require a future enhancement (e.g. `track()` returning the promise, or a render callback).

## 07 Custom XDM fields

Use the `xdm` field to set arbitrary XDM properties beyond eVars/props/events. Custom XDM fields are **deep-merged** with the auto-generated AA mappings, so you can freely combine them with `eVars`, `events`, etc.

**Object form** — nested objects are merged recursively:

```javascript
const definition = {
  "shop:purchase": {
    eventType: "commerce.purchases",
    events: ["event50"],
    eVars: [{ eVar11: "shop:purchase" }],
    xdm: {
      commerce: {
        purchases: { value: 1 },
        order: {
          currencyCode: "EUR",
          priceTotal: (cmp) => cmp.order_total,
        },
      },
      productListItems: (cmp) =>
        cmp.products.map((p) => ({
          SKU: p.sku,
          name: p.name,
          quantity: p.qty,
          priceTotal: p.price * p.qty,
        })),
    },
  },
}
```

> **Merchandising eVars:** Product-level eVars (merchandising) are set inside `productListItems` entries via `_experience.analytics.customDimensions.eVars`. Per-product events go into `productListItems[]._experience.analytics.event1to100`. See [eVar (merchandising) implementation](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/evar-merchandising) for details. The `xdm` field supports this out of the box — no special handling required.
>
> **Heads up:** If you set the same event both via the `events` array (top-level) and inside `productListItems` (per-product), the top-level value takes precedence. Avoid duplicating events across both levels.

**Pairs form** — flat path/value tuples, useful for deeply nested or indexed paths:

```javascript
const definition = {
  "shop:product-view": {
    events: ["event51"],
    xdm: [
      ["commerce.productViews.value", 1],
      ["productListItems[0].SKU", (cmp) => cmp.sku],
      ["productListItems[0].name", (cmp) => cmp.product_name],
    ],
  },
}
```

**`xdmPairs`** — additional pairs merged *after* `xdm`, useful for overrides or additions alongside an object-form `xdm`:

```javascript
const definition = {
  "shop:add-to-cart": {
    events: ["event52"],
    xdm: {
      commerce: { productListAdds: { value: 1 } },
    },
    xdmPairs: [
      ["productListItems[0].SKU", (cmp) => cmp.sku],
      ["productListItems[0].quantity", (cmp) => cmp.qty],
    ],
  },
}
```

All values — including nested ones — can be resolver functions `(cmp) => value` that receive the component state.

## 08 Module structure

```
xdmtracker/
├── index.js          Plugin entry point (define/track API)
└── lib/
    ├── paths.js       parse_path, set_deep_path, ensure
    ├── resolve.js     Resolve function values against component state
    ├── aa-mapping.js  event_path_for, coerce_events_into_xdm, coerce_kv_array_into_xdm
    ├── xdm-builder.js merge_xdm_object, apply_xdm_pairs, build_xdm
    └── payload.js     build_payload (full sendEvent envelope)
```
