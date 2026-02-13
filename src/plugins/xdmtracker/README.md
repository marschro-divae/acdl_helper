# Plugin - xdmtracker

## Table of Contents

1. [Description](#01-description)
2. [API](#02-api)
   - [define(config)](#defineconfig)
   - [track(event, send_opts?)](#trackevent-send_opts)
3. [Defaults](#03-defaults)
4. [Definition fields vs. send options](#04-definition-fields-vs-send-options)
   - [XDM mapping reference](#xdm-mapping-reference)
   - [Definition fields](#definition-fields)
   - [Send options](#send-options)
5. [Page view vs. link click](#05-page-view-vs-link-click)
6. [Custom XDM fields](#06-custom-xdm-fields)
7. [Module structure](#07-module-structure)

---

## 01 Description

Transforms declarative tracking definitions into Adobe XDM payloads and sends them via `alloy("sendEvent", ...)`.

Define your tracking events once as a configuration object (keyed by ACDL event name), then pass the ACDL event to `track()`. The plugin automatically resolves the event name for the definition lookup and extracts the affected component's state for resolver functions.

- `name`: xdmtracker
- `dependencies`: []
- `events`: []

## 02 API

### `define(config)`

Load a tracking definition with optional defaults. Call once after the library is initialized.

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

> **Note:** `eventType` is optional. If omitted, it defaults automatically based on the `pageView` flag:
> `pageView: true` → `"web.webpagedetails.pageViews"` | otherwise → `"web.webInteraction.linkClicks"`

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

Defaults support the same XDM-building fields as event definitions: `eVars`, `props`, `lists`, `events`, `xdm`, `xdmPairs`. Event-specific fields (`pageView`, `eventType`, `webInteractionName`, `webInteractionType`) and send options (`renderDecisions`, etc.) are NOT supported in defaults.

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
| `data` | `payload.data` | Non-XDM data passthrough (e.g. for data element mappings in server-side rules) |

### Definition fields

| Field      | Type    | Default | Description |
|------------|---------|---------|-------------|
| `pageView` | Boolean | `false` | `true` = page view (`s.t()`), sets `webPageDetails.pageViews.value = 1`. Omit or `false` = link click (`s.tl()`) |
| `eventType` | String | auto | XDM event type (e.g. `"web.webpagedetails.pageViews"`, `"commerce.purchases"`). Defaults based on `pageView` flag |
| `webInteractionName` | String | event key | Link click only: the name shown in AA reports. Defaults to the ACDL event name |
| `webInteractionType` | String | `"other"` | Link click only: `"other"`, `"download"`, or `"exit"` |
| `events`   | Array   | — | AA events: `"event48"`, `"event48=22"`, `{ event48: 3 }`, or `(cmp) => ...` |
| `eVars`    | Array   | — | `[{ eVar4: "static" }, { eVar5: (cmp) => cmp.x }]` |
| `props`    | Array   | — | Same format as eVars |
| `lists`    | Array   | — | Same format as eVars |
| `xdm`      | Object or Array | — | Object for deep merge, or pairs `[["path", value], ...]` |
| `xdmPairs` | Array   | — | Additional `[["path", value], ...]` pairs merged after `xdm` |

All values can be static or resolver functions `(cmp) => value`.

### Send options

Configurable at both definition level (per-event override) and `send_opts` level (call-level default).

**Precedence:** `def.X` → `send_opts.X` → hardcoded default

| Option | Default | Description |
|--------|---------|-------------|
| `renderDecisions` | `false` | Auto-render Adobe Target/Personalization decisions |
| `documentUnloading` | `false` | Use `navigator.sendBeacon` for page-exit tracking |
| `datastreamId` | `null` | Override the alloy instance's default datastream |
| `data` | `null` | Non-XDM data passthrough |

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

## 05 Page view vs. link click

The `pageView` flag controls which XDM web fields are auto-populated:

| `pageView` | XDM fields set | `eventType` default | Equivalent |
|---|---|---|---|
| `true` | `web.webPageDetails.pageViews.value = 1` | `"web.webpagedetails.pageViews"` | `s.t()` |
| `false` / omitted | `web.webInteraction.name`, `.type`, `.linkClicks.value = 1` | `"web.webInteraction.linkClicks"` | `s.tl()` |

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

## 06 Custom XDM fields

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

## 07 Module structure

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
