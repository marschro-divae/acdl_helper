# xdmtracker — multi-org sending (multiple Web SDK instances)

> **Status:** ✅ Implemented in **v1.10.0** — pending browser/Assurance verification
> **Plugin:** [`src/plugins/xdmtracker`](../../../src/plugins/xdmtracker)
> **Type:** feature (additive, backward compatible)
> **Changelog:** see the `1.10.0` section of [`CHANGELOG.md`](../../../CHANGELOG.md)
> **Code:** [`lib/targets.js`](../../../src/plugins/xdmtracker/lib/targets.js) (new) ·
> [`index.js`](../../../src/plugins/xdmtracker/index.js) ·
> [`lib/payload.js`](../../../src/plugins/xdmtracker/lib/payload.js)
> **Tests:** [`tests/multi-org-targets.test.js`](../../../tests/multi-org-targets.test.js) ·
> [`tests/single-instance-characterization.test.js`](../../../tests/single-instance-characterization.test.js) (frozen)

---

## 1. Problem / motivation

One consumer project must send its tracking to **two different Adobe Orgs**:

| Target | Org | Purpose | Shape of the data |
|---|---|---|---|
| **primary** | Org A | classical **Adobe Analytics** | `_experience.analytics.*` — eVars, props, lists, events |
| **secondary** | Org B | **Customer Journey Analytics** | plain/tenant **XDM field groups**, no AA variables |

Today `xdmtracker` is hard-wired to a **single** Web SDK instance: `track_impl()` calls
`window.alloy("sendEvent", payload)` directly
([`index.js`](../../../src/plugins/xdmtracker/index.js), the `send()` closure), and the
init check errors when `window.alloy` is not a function. There is no way to express
"send this event to instance X too, with a different payload".

Requirements from the project:

1. **N orgs**, not just two — `alloy()`, `volkswagen()`, … theoretically *n* instances.
2. **Per-org definitions** — the CJA org gets a genuinely different payload (XDM field
   groups instead of AA eVars/props/events), not the same payload twice.
3. **Delta-only sending** — but it must *also* be possible to say "same as the primary
   definition, plus these extra fields" without duplicating the whole definition.
4. **Understandable** — a tracking schema is read and maintained by analysts, not only
   by developers. Whatever we add must not turn the definition into a puzzle.

## 2. Adobe constraints (what the platform forces on us)

Multi-org is **not** a payload-level trick — it is a **multi-instance** concern. Adobe's
rules for running more than one Web SDK instance on a page:

- Instances are **named globals**, declared in the base code array — the same snippet
  that creates `window.alloy` creates `window.volkswagen`:

  ```javascript
  !function(n,o){o.forEach(function(o){n[o]||((n.__alloyNS=n.__alloyNS||
  []).push(o),n[o]=function(){var u=arguments;return new Promise(
  function(i,l){n.setTimeout(function(){n[o].q.push([i,l,u])})})},n[o].q=[])})}
  (window,["alloy","volkswagen"]);
  ```

- Each instance is **configured separately** (`configure` per instance) and **must** have
  its **own unique `datastreamId`** *and* its **own unique `orgId`**. Adobe states it as a
  hard rule: only one instance per page may carry a given `edgeConfigId`, and only one per
  page may carry a given `orgId` — otherwise the instances collide on cookies.
- All state is **isolated per instance**: "any command that uses `titanium` is kept
  isolated from `copper`". Each org therefore keeps its **own ECID / identity cookie**
  (`kndctr_<ORGID>_AdobeOrg_identity`) and its own consent state.
- The **Tags/Launch Web SDK extension supports multiple instances natively** — an
  "Add instance" button, a per-instance name field, and an "Instance" dropdown on the
  *Send event* action (disabled when only one instance exists).

**Consequences for us:**

- ✅ One instance **per org** is the sanctioned path — there is no single-instance shortcut.
- ⚠️ Every event sent to *n* orgs is *n* network calls, and each instance runs its **own
  identity handshake** (separate ECIDs — the two orgs cannot see the same visitor ID
  unless stitched via an `identityMap` / first-party ID we supply ourselves).
- ⚠️ Consent must be granted **per instance** — `setConsent` on one instance says nothing
  about the other. That is injection/configure-time territory, not payload territory.
- ⚠️ Instance-level settings that touch the DOM or auto-collect must be enabled on **one**
  instance only, or the page double-acts: `clickCollectionEnabled` (duplicate link hits),
  `prehidingStyle` / personalization (double flicker handling).

**The datastream schema is the real gatekeeper — so client-side filtering is *hygiene*, not
correctness.** Another org means another datastream, and the datastream's XDM schema decides
what is actually ingested: fields the schema does not expect are **dropped at the Edge
anyway**. So sending an `_experience.analytics.*` block to a CJA datastream is not a data
*correctness* problem — Adobe discards it. This deliberately lowers the stakes of the
target-level capability flags ([§4](#4-decision-2--the-definition-model-targets)) and is the
reason the plugin should **never override what an integrator explicitly wrote**. What the
flags still buy, and why they stay:

- **Payload size** — the duplicated AA block rides along on *every* hit to *every* org.
- **Accidental interpretation** — "the schema drops it" only holds while the second
  datastream has **no Adobe Analytics service** enabled. An org running both AA and CJA
  would silently *interpret* those eVars into a second report suite. The flag is the
  defense against a datastream config we do not control.
- **Governance** — "it was dropped after we transmitted it" is a weaker position than "it
  was never sent to that org". The data still leaves the browser and reaches that org's Edge.
- **Debuggability** — a clean, minimal payload per org is far easier to read in Assurance.

> **Verify, don't trust** (per [`CLAUDE.md`](../../../CLAUDE.md)): the ECID-per-org, the
> per-instance consent, the schema-drops-unexpected-fields behavior, and the
> double-click-collection points above are derived from the
> docs and from how the cookie names are scoped — they are the **hypothesis**, not proven
> facts, and must be hand-confirmed in Assurance / the network payloads during
> implementation. The one/orgId + one/datastreamId rule is documented explicitly and is
> the load-bearing constraint of this concept.

## 3. Decision 1 — who injects and configures alloy?

The open question from the brief: keep injecting the Web SDK through the **Launch Web SDK
extension**, or make `xdmtracker` **wrap the alloy library** and instantiate the instances
itself?

| Option | What it means | Verdict |
|---|---|---|
| **A — external injection stays (Launch extension), xdmtracker becomes *instance-aware*** | Launch's Web SDK extension declares and configures every instance (it already supports multiple). `xdmtracker` only **resolves a named instance handle** (`window[name]`) per target and sends to it. | ✅ **Recommended** |
| **B — xdmtracker wraps alloy** | The plugin writes the `__alloyNS` base-code stub, loads `alloy.js`, and runs `configure` per instance from its own config. | ❌ Rejected for now |
| **C — hybrid** | A by default, plus an explicit opt-in escape hatch where the plugin creates/configures instances Launch does not manage. | 🅾️ Deferred — only if a project actually has no Launch multi-instance support |

**Why A:**

- **The plugin's job is the payload, not the transport.** `xdmtracker` turns declarative
  definitions into XDM and hands them to a `sendEvent`. Nothing about multi-org changes
  that; only the *handle* it sends through becomes plural. This is a genuinely small change
  (a name lookup instead of a hard-coded `window.alloy`).
- **No runtime dependencies** is a standing architecture rule of this library
  ([`CLAUDE.md`](../../../CLAUDE.md)). Owning alloy means either bundling it (size, and we
  inherit Adobe's release cadence and its version pinning) or script-loading it from
  Adobe's CDN at runtime — a remote runtime dependency in all but name.
- **Personalization timing would get worse.** The Launch extension loads and configures the
  SDK very early in the page lifecycle. `acdl_helper` initializes **asynchronously** (see
  [`src/core/index.js`](../../../src/core/index.js)) and its plugins come up later still —
  loading alloy from inside plugin init means personalization renders later, which means
  **more flicker**, the exact problem the prefetch/render-gate work in
  [`xdmtracker-single-page-view`](../xdmtracker-single-page-view/) exists to solve.
- **We would be re-implementing an Adobe-supported product surface**: consent plumbing,
  identity, click collection, prehiding, library upgrades, per-instance datastream config —
  all of which the extension already exposes as configuration, per instance, with a UI the
  client's Adobe team already knows.
- **Division of responsibility stays clean and already proven**: Launch = *load + configure*
  the SDK; `xdmtracker` = *build + send* the events. That is exactly the current
  single-org setup — this feature does not change the contract, it only makes the
  "send" side plural.

**What we take on instead:** the plugin must fail **loudly and per target** when a
configured instance name is not a function on `window` — the multi-instance base code is
easy to get wrong (an instance declared in Launch but missing from the base code array,
or a name typo), and a silent no-send to the second org would be discovered months later
in a CJA report that is simply empty.

## 4. Decision 2 — the definition model: **targets**

### 4.1 Concept

Introduce one new concept, **`targets`** — a named destination = (a Web SDK instance +
its own defaults + its own options). Everything else is layering.

- **Top level:** declare the targets once.
- **Per event:** optionally say, in **one** key (`targets`), what changes per target — or
  `false` to skip a target entirely.
- **Default:** an event with no target keys goes to **all declared targets**, each with its
  own defaults applied — so switching a project to multi-org is a config change, not a
  rewrite of every event.

**Guiding principle — *specialness is declared at the level where it is actually special*.**
There are two kinds of "different per org", and they belong in different places:

| Kind of difference | Where it is declared | How often |
|---|---|---|
| **Systematic** — "this org *always* gets a different shape": no AA variables, its own base fields, no personalization | the **target** config (`analytics: false`, `useGlobalDefaults: false`, its own `defaults`, `personalization: false`) | **once** |
| **Event-specific** — "*this one* event carries an extra CJA field / has a genuinely different definition / must not leave Org A" | the event's `targets` entry (overlay, `extends: false`, `false`) | **rarely** |

The default is therefore "**send the same event to every org**", and an event only says
something when it is genuinely special — *do something special only if it is special*.
Crucially, that default is only *intuitive* because the target-level capabilities exist:
literally duplicating an AA payload (`_experience.analytics.*`) into a CJA-purpose
datastream is meaningless there (the schema drops it — see
[§2](#2-adobe-constraints-what-the-platform-forces-on-us)) and is dead weight on every hit,
so without `analytics: false` every single event would need a hand-written override and the
"default" would be a trap rather than a convenience.

> **Note on stakes:** the capability flags are **payload hygiene**, not data correctness —
> the receiving datastream's schema drops what it does not expect regardless
> ([§2](#2-adobe-constraints-what-the-platform-forces-on-us)). That is precisely why they may
> filter *inheritance* but must never override an explicit per-target instruction.

> **Health metric for this design:** count the events that need a `targets` entry. A
> handful — good. Most of them — the *target* config is under-powered and the missing
> systematic capability should be found and added there, not papered over event by event.

### 4.2 Config shape

```javascript
acdl_helper({
  plugins: {
    xdmtracker: {
      autoTrack: true,

      // ── NEW: the destinations ────────────────────────────────────────────────
      targets: {
        aa: {                            // logical key, used in event overlays
          instance: "alloy",             // window.alloy — defaults to the key itself
          primary: true,                 // optional marker: first in fan-out order
        },
        cja: {
          instance: "volkswagen",        // window.volkswagen — the second Org's instance
          useGlobalDefaults: false,      // AA-shaped global defaults are wrong here
          analytics: false,              // don't inherit eVars/props/lists/events
          personalization: false,        // never send renderDecisions/personalization here
          defaults: {                    // this target's own base layer (CJA/XDM shaped)
            xdm: {
              _tenant: {
                pageName: () => acdl_helper.page.get("dc:title"),
                pageUrl: () => document.location.href,
              },
            },
          },
        },
      },

      // ── unchanged: global defaults + events ──────────────────────────────────
      defaults: { eVars: [{ eVar1: () => document.location.href }] },
      events: { /* … see below … */ },
    },
  },
})
```

`targets` omitted → exactly today's behavior: one implicit target `{ instance: "alloy" }`.

### 4.3 Layering rules

For **each** target `T` an event is sent to, the payload is built from ordered layers —
the same mechanism `defaults → event definition` already uses
([`xdm-builder.js`](../../../src/plugins/xdmtracker/lib/xdm-builder.js) `build_xdm(def, cmp, logger, xdm)`
accepts a base XDM to build on):

| # | Layer | Skipped when |
|---|---|---|
| 1 | global `defaults` | `T.useGlobalDefaults === false`, or the event is `fetchOnly` (existing rule) |
| 2 | `targets[T].defaults` | the event is `fetchOnly` (same rule) |
| 3 | the **shared event definition** | the event's `targets[T].extends === false` |
| 4 | the event's **`targets[T]` overlay** | — |

- **XDM-building fields** (`eVars`, `props`, `lists`, `events`, `xdm`, `xdmPairs`) **layer**:
  later layers override *per variable / per path*, they do not replace the whole field.
  This is what makes "delta only" work — an overlay carrying one extra eVar keeps the rest.
- **Semantic + send fields** (`pageView`, `fetchOnly`, `eventType`, `webInteractionName`,
  `webInteractionType`, `renderDecisions`, `documentUnloading`, `personalization`,
  `datastreamId`, `edgeConfigOverrides`, `data`, `gateTimeout`) resolve **last-wins**:
  target overlay → shared event definition → target config → `send_opts` → default.
- **Target capabilities filter what an *inherited* layer may contribute.** `analytics: false`
  drops the **AA variable mapping** (`eVars`, `props`, `lists`, `events` →
  `_experience.analytics.*`) from the inherited layers 1–3 for that target (see the next
  bullet for layer 4), while `xdm`/`xdmPairs` still layer normally and the
  event *semantics* (`pageView`, `eventType`, `webInteraction*`) still apply.
  This is what makes the **delta case usable for CJA**: the secondary target inherits
  "this is a page view" and every custom XDM field, but not a single AA variable — without
  needing `extends: false` and a hand-repeated event body. `personalization: false` works
  the same way for `renderDecisions`/`personalization`.
- **A capability declines to *inherit*; it never overrides what you explicitly wrote.**
  `analytics: false` filters the **inherited** layers (global `defaults`, the target's own
  `defaults`, the shared event body) — that is its whole job: "do not duplicate the AA block
  into this org". But an AA field written **directly in that target's overlay** is
  **honored**, with a `warning` noting it is unusual for a target that declares
  `analytics: false`. Rationale: the Edge drops schema-unexpected fields anyway
  ([§2](#2-adobe-constraints-what-the-platform-forces-on-us)), so honoring an explicit
  instruction costs nothing, while silently discarding hand-written definition data is the
  worse failure — the library would be disagreeing with its author, and the author is the
  authority. The warning still catches the likely copy-paste-from-AA mistake.
  *(An earlier draft made this a hard invariant that dropped overlay fields too — rejected:
  see the reasoning above.)*
- `extends: false` in an overlay is the **"a genuinely different definition"** switch: the
  shared event body is dropped and only the target's own defaults + overlay build the
  payload. Layers 1–2 still apply unless separately opted out.

### 4.4 Routing and shaping are **one** key

An earlier draft of this concept had **two** event keys: `sendTo` (an allowlist of targets)
*and* `targets` (the per-target overlay). That was **redundant and is rejected** — for a
fixed set of targets `sendTo: ["aa"]` and `targets: { cja: false }` say exactly the same
thing, and two mechanisms for one decision needed a referee rule ("an overlay for a
`sendTo`-excluded target is ignored with a warning") that exists only because of the
duplication.

**One key, `targets`, whose value per target is either an object or `false`:**

| Event writes | Target T receives | Payload for T |
|---|---|---|
| nothing (no `targets` key) | ✅ yes | the shared definition + T's defaults |
| `targets: { T: { … } }` | ✅ yes | shared definition + T's defaults + this overlay |
| `targets: { T: { extends: false, … } }` | ✅ yes | T's defaults + this overlay only |
| `targets: { T: false }` | ❌ no | — **no `sendEvent` call to that instance at all** (not an empty or filtered payload — nothing is sent, so no hit is recorded in that org) |
| nothing, and `T.optIn === true` | ❌ no | — (T only takes events that name it) |

- **An overlay never means "only".** `targets: { cja: {…} }` is "add these fields for CJA",
  never "stop sending to AA" — otherwise adding one CJA field would silently switch off
  Adobe Analytics for that event.
- **`false` is the exclusion.** "AA only" is `targets: { cja: false }`; "CJA only" is
  `targets: { aa: false, cja: {…} }`. Any non-object, non-`false` value **warns and is
  treated as if the entry were absent** — so the target still receives the shared
  definition. A `null`/`0` typo therefore produces a loud log, never a silently dropped org.
- **Allowlist semantics, when wanted, live on the target — not on every event.**
  `optIn: true` inverts the default for one target: it then receives **only** events whose
  `targets` overlay names it (an empty `{}` is enough). This is the right home for it,
  because "does the new org get everything by default?" is a fact about that org's rollout
  state, not something to restate on 200 event definitions. It also covers the likely real
  shape of a CJA org: a **curated** event set rather than the full AA firehose.
- **Explicit always beats implicit.** Wherever a rule *defaults* a target out of an event —
  `optIn: true`, or `personalization: false` skipping a `fetchOnly` event — an explicit
  overlay entry for that target (even an empty `{}`) reads as "yes, this one too" and is
  honored, with a `warning` when it contradicts a declared capability. Same principle as
  [§4.3](#43-layering-rules): the plugin declines to *infer*, never overrides what was
  *written*.
- **Target `enabled: false` wins over everything** — a killed target receives nothing,
  whatever the events say. It is the one hard override, because it is the kill switch.

> **Cost of the collapse, stated honestly:** with a blocklist, adding a fourth target means
> every event without an explicit `false` starts feeding it. That is the *desired* default
> for a like-for-like second org, and `optIn: true` covers the case where it is not — so the
> capability is kept, just moved to where it is declared once.

### 4.5 Worked example — AA payload + CJA delta

```javascript
events: {
  "my-app:page-load": {
    pageView: true,
    events: ["event1"],
    eVars: [{ eVar11: "my-app:page-load" }, { eVar20: (cmp) => cmp["dc:title"] }],
    personalization: { includeRenderedPropositions: true },

    // Goes to BOTH targets (no exclusion). The CJA org inherits the page-view
    // semantics PLUS these extra fields (delta) — but no eVars/events
    // (targets.cja.analytics: false) and no personalization
    // (targets.cja.personalization: false).
    targets: {
      cja: {
        xdm: { _tenant: { journey: { step: (cmp) => cmp.step } } },
      },
    },
  },

  // Fully separate definition for the CJA org: no AA variables at all.
  "my-app:configurator:complete": {
    events: ["event42"],
    eVars: [{ eVar11: "my-app:configurator:complete" }],
    targets: {
      cja: {
        extends: false,                   // ← ignore the AA body above
        eventType: "web.webInteraction.linkClicks",
        xdm: {
          _tenant: {
            configurator: {
              completed: true,
              model: (cmp) => cmp.model,
              price: (cmp) => cmp.price,
            },
          },
        },
      },
    },
  },

  // Primary only — never leaves Org A.
  "my-app:search:error": {
    events: ["event2"],
    eVars: [{ eVar11: "my-app:search:error" }],
    targets: { cja: false },              // ← excluded
  },

  // Secondary only — a CJA-specific event Org A does not care about.
  "my-app:journey:milestone": {
    xdm: { _tenant: { journey: { milestone: (cmp) => cmp.name } } },
    targets: { aa: false },               // ← excluded
  },
}
```

### 4.6 Interface reference

Two levels, and that is the whole interface. **Systematic** differences are declared once on
the target; an **event** speaks up only when it is genuinely special.

#### Level 1 — the targets (declared once)

```javascript
xdmtracker: {
  targets: {
    aa: { instance: "alloy", primary: true },          // window.alloy      → Org A (AA)
    cja: {
      instance: "volkswagen",                          // window.volkswagen → Org B (CJA)
      useGlobalDefaults: false,                        // skip the AA-shaped global defaults
      analytics: false,                                // don't inherit eVars/props/lists/events
      personalization: false,                          // no renderDecisions; skip fetchOnly events
      defaults: {                                      // this org's own base layer
        xdm: { _vwtenant: { page: { name: () => acdl_helper.page.get("dc:title") } } },
      },
    },
  },

  defaults: { /* unchanged */ },
  events: { /* unchanged */ },
}
```

| Target key | Default | Meaning |
|---|---|---|
| `instance` | the target key | The global Web SDK instance (`window[instance]`) |
| `primary` | first declared | Fan-out order / log emphasis |
| `defaults` | — | This target's own base layer (same fields as global `defaults`) |
| `useGlobalDefaults` | `true` | `false` = ignore the global `defaults` |
| `analytics` | `true` | `false` = don't **inherit** AA variable mapping (explicit overlay fields still honored) |
| `personalization` | `true` | `false` = no `renderDecisions`/`personalization`; `fetchOnly` events skipped |
| `optIn` | `false` | `true` = receives **only** events whose `targets` overlay names it |
| `enabled` | `true` | Kill switch for the whole target |
| `datastreamId`, `edgeConfigOverrides`, `documentUnloading`, `gateTimeout` | — | **Transport-only** send options. Per-event semantics (`pageView`, `fetchOnly`, `eventType`, `webInteraction*`, `data`) are deliberately not settable per target — a target-level default there would silently reshape every event sent to that Org (`TARGET_SEND_FIELDS` in `lib/targets.js`) |

#### Level 2 — per event, one key: `targets`

```javascript
// 1. NOTHING — both orgs, same event, each with its own defaults. The common case.
"vw:cta:click": { events: ["event5"], eVars: [{ eVar11: "vw:cta:click" }] },

// 2. DELTA — both orgs; CJA gets one field on top. Nothing repeated.
"vw:page:load": {
  pageView: true,
  events: ["event1"],
  targets: { cja: { xdm: { _vwtenant: { page: { type: (cmp) => cmp["dc:type"] } } } } },
},

// 3. REPLACE — CJA gets a genuinely different definition.
"vw:configurator:complete": {
  events: ["event42"],
  targets: {
    cja: {
      extends: false,                                  // ← drop the shared body
      xdm: { _vwtenant: { configurator: { model: (cmp) => cmp.model } } },
    },
  },
},

// 4. EXCLUDE — never leaves Org A.
"vw:search:error": { events: ["event2"], targets: { cja: false } },

// 5. OPT IN — only needed when that target declares optIn: true.
"vw:journey:milestone": {
  xdm: { _vwtenant: { journey: { milestone: (cmp) => cmp.name } } },
  targets: { cja: {} },                                // ← "yes, this one too"
},
```

| Event writes | Reaches the target? | Payload |
|---|---|---|
| nothing | ✅ (unless `optIn`) | shared definition + target defaults |
| `{ … }` | ✅ | shared definition + target defaults + overlay |
| `{ extends: false, … }` | ✅ | target defaults + overlay only |
| `false` | ❌ | — |

#### Layering, per target

```
global defaults → target defaults → shared event body → target overlay
```

Later layer wins **per variable / per XDM path**, so an overlay adds without replacing the
rest. Capabilities (`analytics`, `personalization`) filter the **inherited** layers only.

#### Backward compatibility

Delete the `targets` block and everything behaves exactly as it does today — one implicit
`alloy` target, one payload, unchanged `track()` return value.

## 5. Backward compatibility (non-negotiable)

Every existing `xdmtracker` definition — config-time or `define()`, manual `track()` or
`autoTrack` — must keep working **untouched and byte-identically** after this feature ships.
No consumer project may need a single edit to upgrade to v1.10.0.

How that is guaranteed by construction:

| Guarantee | Mechanism |
|---|---|
| `targets` omitted → today's behavior exactly | Absence of `targets` synthesizes **one implicit target** `{ key: "alloy", instance: "alloy", primary: true }`. The multi-target path is the *only* code path; single-org is the *n = 1* case of it — so there are never two behaviors to drift apart. |
| Existing definition keys unchanged | `targets` is the single **new, optional** event key. Every existing field (`pageView`, `fetchOnly`, `eVars`, `props`, `lists`, `events`, `xdm`, `xdmPairs`, `eventType`, `webInteraction*`, `renderDecisions`, `personalization`, `documentUnloading`, `datastreamId`, `edgeConfigOverrides`, `data`, `gateTimeout`) keeps its exact current meaning and precedence. |
| Global `defaults` unchanged | With one implicit target and no target `defaults`, the layer list collapses to `[global defaults]` → the current two-pass `defaults → event` build, including the existing **`fetchOnly` skips defaults** rule. |
| `define()` / config-time define unchanged | Untouched. `targets` lives in the **plugin config** (it describes destinations, not the tracking schema), so `define()`'s validated shape stays `{ events, defaults? }`. |
| `autoTrack` unchanged | It already calls the internal `track_impl`; fan-out happens below it. One listener before, one listener after. |
| Render gate unchanged for one instance | The per-target gate map with a single key behaves identically to today's single closure variable — same one-shot, same `gateTimeout` fallback. |
| `alloy` stays the default global | The implicit target's instance name is `"alloy"`, and `init()`'s "Web SDK is missing" error keeps firing for it. |
| `track()` return value unchanged in legacy mode | Single payload object when `targets` is absent; only a multi-target config returns the keyed map (see [open decisions](#10-open-decisions)). This is the **only** place multi-org is observable in an existing API, and it is opt-in by configuration. |
| `build_payload` signature stays callable | Its `defaults` parameter accepts an array of layers **or** a single object (normalized internally) — so existing direct unit tests of the pure function keep passing unmodified. |

**Enforcement, not intention:** the refactor starts with **characterization tests** that lock
current single-instance behavior (payload shape, defaults layering, render gate one-shot,
`track()` return value, autoTrack listener count) and those tests are **not allowed to
change** while the feature is built. A regression in single-org behavior therefore fails
CI rather than reaching a consumer project.

## 6. Behavioral edge cases to get right

- **The render gate must become per instance.** Today `_render_gate` is a single closure
  variable ([`index.js`](../../../src/plugins/xdmtracker/index.js)). A render finishing on
  `alloy` says nothing about `volkswagen`'s render, so the gate has to be a **map keyed by
  target**, otherwise a page view to Org B could be deferred behind — or released by — an
  unrelated render in Org A. One-shot semantics stay per target.
- **`fetchOnly` / personalization belong to one target.** A `decisioning.propositionFetch`
  to a CJA org is pure noise. A target with `personalization: false` is **skipped entirely**
  for `fetchOnly` events and never *inherits* `renderDecisions` / `personalization` — unless
  the event's overlay for that target says otherwise explicitly, which wins with a warning
  ([§4.4](#44-routing-and-shaping-are-one-key), explicit beats implicit).
- **Resolvers run once per target.** `(cmp) => …` is evaluated per payload, so with *n*
  targets a resolver runs *n* times. Resolvers must be **pure** (they already should be) —
  worth documenting explicitly, and worth considering a per-`track()` memo cache if a
  project hits a costly resolver.
- **`track()`'s return value changes shape** when targets are configured. Proposal: keep
  returning the single payload in legacy (no `targets`) mode, and return a map keyed by
  target (`{ aa: payload, cja: payload }`) in multi-target mode. See open decisions.
- **`init()`'s instance check goes plural** — one error per configured instance name that
  is not a function on `window`, naming the target key *and* the expected global, since a
  missing base-code entry is the most likely integration mistake.
- **Logging must be target-tagged.** `prepared payload` becomes `[aa] prepared payload` /
  `[cja] prepared payload` — with *n* payloads per event, an untagged console is unusable.
- **`autoTrack` needs no changes.** It calls the internal `track_impl`, which fans out —
  one listener, *n* sends.
- **Send order** follows target declaration order (primary first), fire-and-forget; no
  target ever blocks another (except its own render gate).
- **A capability must not be bypassable via `send_opts`.** `build_payload` falls back to
  the call-level `send_opts` whenever the definition is silent, so merely *omitting*
  `renderDecisions`/`personalization` from a `personalization: false` target's semantics
  would let `track(event, { renderDecisions: true })` leak personalization to that Org.
  The per-target send options are therefore sanitized before the payload is built. An
  explicit overlay still wins, because it lands in the definition layer and the definition
  beats `send_opts`. *(Found in self-review; covered by a test.)*
- **Normalization runs once.** The plugin context is `Object.freeze`d
  ([`plugin_utils.js`](../../../src/core/lib/plugin_utils.js)) so the target list cannot be
  cached on it — but `impl(context)` creates both the `init` and `provider` closures, so it
  is normalized there and passed to both. Otherwise every config warning would be logged
  twice.

## 7. Rejected alternatives

| Rejected approach | Why not |
|---|---|
| **One instance + `edgeConfigOverrides.datastreamId` per org** | Tempting (zero new concepts, it already exists as a send option) but **wrong**: a datastream belongs to an org/sandbox, and identity is org-scoped. The hit would carry Org A's ECID and Org A's cookie context while claiming Org B's datastream. Adobe requires one `orgId` **and** one `datastreamId` per instance for exactly this reason. Datastream overrides are an *intra*-org routing tool, not a cross-org one. |
| **Duplicate the whole definition per target** (`targets: { aa: { events }, cja: { events } }`) | Simple and explicit, but no delta support — every shared eVar and every new event has to be maintained twice, drifting immediately. Note the recommended overlay model **subsumes** this: `extends: false` on every overlay gives exactly these semantics when a project wants full separation. |
| **Derive the CJA payload automatically from the AA definition** (map eVars → XDM field groups) | Too magic and project-specific: the tenant schema, field names, and granularity are chosen per client. Guessing them would produce silently wrong CJA data — the worst failure mode. Explicit `xdm`/`xdmPairs` in the target overlay covers it. |
| **A second `xdmtracker` plugin instance** (one plugin per org) | The core loads one instance per plugin name ([`plugin_utils.js`](../../../src/core/lib/plugin_utils.js)); it would need a plugin-aliasing mechanism in the core, duplicate the data-layer listener (autoTrack twice), duplicate the render gate, and give no path for shared/delta definitions. Far more machinery than a target loop inside one plugin. |
| **xdmtracker wraps/loads alloy itself** | See [§3](#3-decision-1--who-injects-and-configures-alloy) — breaks the no-runtime-dependency rule, worsens personalization timing, and re-implements a supported Adobe extension surface. |

## 8. Implementation plan

1. **`lib/targets.js` (new, pure)** — the whole concept, unit-testable in isolation:
   - `normalize_targets(config, logger)` → ordered array of target descriptors; synthesizes
     the single implicit `alloy` target when `targets` is absent; validates names, warns on
     an unknown key referenced by a `targets` overlay, and non-object/non-`false` values.
   - `resolve_send_targets(def, targets, logger)` → the targets an event goes to (`targets`
     `false` exclusions, `optIn`, `enabled`, the `personalization: false` + `fetchOnly` skip rule).
   - `resolve_target_def(def, target)` → `{ layers: [...], semantics: {...} }` per §4.3.
2. **`lib/payload.js`** — `build_payload` takes an **array of base layers** instead of the
   single `defaults` object (normalize a non-array argument for back-compat), and the
   flattened semantics object. No change to how the envelope itself is assembled.
3. **`index.js`** — `track_impl` loops the resolved targets: build per target, resolve
   `window[target.instance]`, send; `_render_gate` becomes a per-target map; `init()`
   checks every configured instance; logs get a `[target]` tag.
4. **Tests** (`tests/`, `node:test`) — **characterization first**: lock today's
   single-instance behavior (payload shape, defaults layering, render gate, `track()`
   return value) so the refactor cannot change it silently. Then: target normalization,
   implicit-target back-compat, `false` exclusion, `optIn` targets, delta overlay, `extends: false`,
   `useGlobalDefaults: false`, `personalization: false` (+ `fetchOnly` skip),
   per-instance render gate isolation, missing-instance error, and autoTrack fan-out.
   Multi-instance stubs = two recording fake globals on the test `window`.
5. **Docs** — new `README.md` section in the plugin ("Multi-org: targets"), seeded from the
   [§4.6 interface reference](#46-interface-reference), a note on the Launch multi-instance base code + extension setup, and
   the shared-vs-delta guidance. Main [`README.md`](../../../README.md) gets a mention.
6. **Changelog + version** — `1.10.0` (additive), and remove the backlog entry on ship.

## 9. Acceptance criteria

- [x] `targets` omitted → byte-identical behavior to v1.9.1 (characterization tests green, unchanged).
- [x] Two declared targets → one ACDL event produces **two** `sendEvent` calls, one per named instance.
- [x] Delta case: an overlay adding fields keeps the shared definition's fields.
- [x] Replace case: `extends: false` produces a payload containing **no** AA variables from the shared body.
- [x] A `targets` overlay alone never changes routing — the event still reaches every target.
- [x] `targets: { <key>: false }` excludes exactly that target; an unknown target key warns and is ignored; a non-object/non-`false` value warns and is ignored (no silent drop).
- [x] `optIn: true` on a target: it receives only events naming it in `targets` (an empty `{}` overlay suffices), and nothing else.
- [x] `useGlobalDefaults: false` keeps the AA-shaped global defaults out of the CJA payload.
- [x] `analytics: false` keeps `_experience.analytics.*` out of that target's payload while custom `xdm` and the `pageView`/`webInteraction` semantics still land.
- [x] `analytics: false` filters only **inherited** layers: an AA field written directly in that target's overlay **is still sent**, with a warning naming target + field. The plugin never silently discards explicitly written definition data.
- [x] Delta case, both directions: an overlay on the **secondary** target adds a CJA-only field, and an overlay on the **primary** target adds an AA-only field, with the shared definition intact in both payloads.
- [x] `personalization: false` strips *inherited* `renderDecisions`/`personalization` and skips `fetchOnly` events for that target — but an explicit overlay for that target on such an event is honored, with a warning.
- [x] `targets: { <key>: false }` results in **no `sendEvent` call** to that instance (asserted on the stub's call count, not just on payload shape).
- [x] Render gate isolation: a pending render on target A never gates or releases a page view on target B.
- [x] A configured instance missing from `window` logs a per-target error naming key **and** global, and does not break the other targets' sends.
- [x] `autoTrack: true` fans out to all targets from its single listener.
- [ ] Hand-verified in the browser: two collect calls, to the two orgs' datastreams, each with the expected payload, in Assurance.

## 10. Open decisions

1. ~~**`track()` return shape in multi-target mode**~~ — **DECIDED & IMPLEMENTED:** a keyed
   map (`{ aa: payload, cja: payload }`, `{}` when no target receives the event) when
   `targets` is configured; the single payload object when it is not. Back-compatible, and
   the key is what integrators debug by.
2. **Target-capability naming** — `analytics: false` / `personalization: false` read well,
   but `personalization` collides visually with the event-level `personalization` *object*
   (boolean-only at target level, so unambiguous to parse) and `analytics` is not obviously
   about *variable mapping* rather than about the Analytics service at the Edge (which is
   `edgeConfigOverrides.com_adobe_analytics.enabled`). Alternatives: `aaVariables: false`,
   or grouping both under `capabilities: { analytics: false, personalization: false }`.
   **DECIDED & IMPLEMENTED:** kept as `analytics` / `personalization`, with one consequence
   now encoded in [`targets.js`](../../../src/plugins/xdmtracker/lib/targets.js)
   (`TARGET_SEND_FIELDS`): because `personalization` is the boolean capability at target
   level, a target **cannot** declare default personalization *options*. Judged YAGNI —
   revisit by renaming the capability if a project ever needs it.
3. **Default fan-out** — should an event with no `targets` entry really go to **all**
   targets? Recommendation: **yes** — migration then costs a config block, not a rewrite of
   every event — with target-level `optIn: true` as the per-target inversion for a curated
   or staged-rollout org. (Supersedes the earlier `sendTo` allowlist and a top-level
   `defaultSendTo`; see [§4.4](#44-routing-and-shaping-are-one-key).)
4. **Consent / identity stitching across orgs** — out of scope for this feature (it is
   injection/configure-time), but the project needs an answer: separate ECIDs per org, and
   an `identityMap` is the only way to stitch. Worth its own investigation.
5. **Option C (self-injection escape hatch)** — build it now or wait for a project that
   actually needs it? Recommendation: **wait**.

## 11. Relevant source

- [`src/plugins/xdmtracker/index.js`](../../../src/plugins/xdmtracker/index.js) — `track_impl` (`send()` closure, `_render_gate`), `init()` instance check, config-time define, autoTrack.
- [`src/plugins/xdmtracker/lib/payload.js`](../../../src/plugins/xdmtracker/lib/payload.js) — `build_payload`, defaults-vs-event layering, `fetchOnly` AA suppression.
- [`src/plugins/xdmtracker/lib/xdm-builder.js`](../../../src/plugins/xdmtracker/lib/xdm-builder.js) — `build_xdm(def, cmp, logger, xdm)`, the base-XDM parameter this design layers on.
- [`src/core/lib/plugin_utils.js`](../../../src/core/lib/plugin_utils.js) — plugin loading/init (why one plugin instance per name).
- [`DOCS/FEATURES/xdmtracker-single-page-view/`](../xdmtracker-single-page-view/) — the render gate / prefetch design this must not regress.

## 12. Sources (Adobe — treat as hypothesis, verify in the browser)

- [Use multiple Web SDK instances](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/use-cases/multiple-instances) — base code array, one `orgId` + one `datastreamId` per instance, instance isolation.
- [Interact with multiple properties](https://experienceleague.adobe.com/en/docs/experience-platform/edge/fundamentals/interacting-with-multiple-properties) — cookie conflict rule.
- [SDK instance configuration settings (tag extension)](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extensions/client/web-sdk/configure/general) — "Add instance", instance name field, multi-org rationale.
- [Send event action](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extensions/client/web-sdk/actions/send-event) — per-action instance selector (we bypass this; we only use the extension's configure).
- [Adobe Web SDK for acquisitions or mergers](https://medium.com/adobetech/adobe-web-sdk-for-acquisitions-or-mergers-82ed9ef810db) — the multi-org use case Adobe designed this for.
