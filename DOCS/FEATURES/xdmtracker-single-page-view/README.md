# xdmtracker — single page view on personalized pages

> **Status:** ✅ Shipped in **v1.7.0**
> **Plugin:** [`src/plugins/xdmtracker`](../../../src/plugins/xdmtracker)
> **Summary deck:** [`summary.html`](summary.html) — reporting-ready slide deck (reveal.js + Mermaid, open in a browser)
> **Changelog:** see the `1.7.0` section of [`CHANGELOG.md`](../../../CHANGELOG.md)

---

## 1. Problem / motivation

On **personalized pages**, Adobe Analytics reporting was wrong:

- **Page Views inflated**
- **Bounce Rate deflated**
- **Single Page Visits deflated**

A visitor who landed on a single personalized page and left was **not** counted
as a bounce. Only pages that rendered Target/personalization were affected.

### Root cause

The tracker sent a page-view event with `renderDecisions: true`. With rendering on,
the Web SDK defaults to `sendDisplayEvent: true` and fires a **second** `interact`
call — the display notification (`decisioning.propositionDisplay`) that tells A4T a
personalization was shown.

That second call carried **no** `web.webInteraction.type`, but the Web SDK
**auto-collects** `web.webPageDetails.URL` on *every* event. So to Adobe Analytics
the display notification looked exactly like a page view → **two page views per visit.**

### The key insight

> Adobe Analytics decides **page-view vs. link-click** purely from
> `web.webPageDetails` vs. `web.webInteraction` in the XDM — **not** from `eventType`.

## 2. Investigation — proven in Assurance, not from docs

Diagnosed on the wire in **Adobe Experience Platform Assurance** (the "Adobe Analytics" view):

- Observed **two** hits per personalized page load; the second had an auto-added
  `web.webPageDetails.URL` and no `webInteraction`.
- Confirmed AA counted that second hit as a page view regardless of its `eventType`.
- Verified that `edgeConfigOverrides.com_adobe_analytics.enabled = false` on the
  prefetch stops the Edge from **forwarding the event to the Analytics service** — the
  event still sends and reaches the datastream; only the AA hit is gone. Target/AEP unaffected.

**Two documented behaviors turned out to be false** (see the "Adobe documentation —
verify, don't trust" note in `CLAUDE.md`):
1. Docs implied `eventType` governs the page-view-vs-link classification — it does not.
2. Docs claimed a `decisioning.propositionFetch` event is auto-dropped by AA — it still produced a page-view hit.

## 3. What didn't work (and why)

| Rejected approach | Why we rejected it |
|---|---|
| **A custom/calculated metric in Adobe Analytics** to subtract the extra page view | Masks the symptom in *one* report. The bad hit is still collected, so every other report, segment and downstream export stays wrong. Patches reporting forever instead of fixing the cause. |
| **Rely on `eventType: "decisioning.propositionFetch"`** to be ignored by AA | Verified in Assurance — the hit was *still* recorded as a page view. `eventType` does not govern hit classification. |
| **Turn off personalization rendering** | Breaks the feature. |
| **Disable display events globally** (`sendDisplayEvent: false` everywhere) | Breaks A4T / Target attribution — we'd lose "personalization was shown". |

## 4. The solution

Split a personalized page load into **two ordered events**, driven by **flags, not event names**:

1. **`fetchOnly` prefetch** — fetches & renders decisions, counted as **nothing**:
   - Emits **no** `web.webPageDetails.pageViews` and **no** `web.webInteraction`
     (so AA has nothing to classify), defaults `eventType` to `decisioning.propositionFetch`,
     and **auto-disables the AA service at the Edge** via
     `edgeConfigOverrides.com_adobe_analytics.enabled = false`. Target & AEP still receive it.
   - Skips the merged `defaults` so the payload stays minimal.
2. **Unified page view** — the single AA hit:
   - Carries `web.webPageDetails.pageViews = { value: 1 }`.
   - Uses `personalization.includeRenderedPropositions: true` so the rendered
     propositions (A4T display attribution) fold into this one hit.

### Supporting mechanics

- **Render gate** — an event that renders decisions captures its alloy promise;
  a later event with `includeRenderedPropositions: true` is deferred until that
  render settles, so the propositions are available to fold in.
- **`gateTimeout`** (default **2000 ms**, overridable per event) — guarantees the
  page view always fires; tracking can never hang on a stalled render.

### Decisive code

- `src/plugins/xdmtracker/lib/payload.js` — `fetchOnly` emits no `web.*` classifier
  and the AA suppression (`com_adobe_analytics.enabled = false`).
- `src/plugins/xdmtracker/index.js` — the render gate: `Promise.race([gate, timeout(ms)]).then(send)`.

## 5. Outcome

- **Confirmed (in Assurance):** a personalized single-page visit now produces
  **exactly one** AA page view, sent on the wire — the spurious second hit is gone.
- **To verify in production:** that the corrected hit volume flows through to
  reporting — **Bounce Rate / Single Page Visits / Page Views back to accurate**, and
  **A4T/Target attribution intact** — once deployed and real reporting data accrues.
- Fixed **at the source**, for every report (no custom AA metric needed).
- Implements Adobe's prefetch + page-view pattern, declaratively.

## 6. Takeaways

- **Verify, don't trust.** Adobe docs were wrong twice — confirm in Assurance / the real hit.
- **Classification = the `web.*` object**, not `eventType`.
- **Fix the cause, not the report.** Removing the bad hit fixes everything downstream.
- **Order + a safety timeout.** Fetch first (counted as nothing) → unified page view, gated but never hanging.

## Appendix — how Adobe Analytics classifies an XDM hit

The hit type is decided by the **`web.*` object**, *not* by `eventType`
([Adobe hit-types rule](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/hit-types) — verified on the wire):

| XDM carries… | Adobe Analytics records | Classic equivalent |
|---|---|---|
| `web.webPageDetails` | **Page view** | `s.t()` |
| `web.webInteraction` (+ `linkClicks`) | **Link click** | `s.tl()` |
| **neither** (or AA disabled at the Edge) | **Nothing** — no AA hit; data still flows to the datastream → Target / AEP / other integrations | — |

> ⚠ The Web SDK **auto-collects `web.webPageDetails.URL` on every event**. So to send
> *nothing* to Adobe Analytics you must drop the classifier **and** disable AA at the
> Edge (`com_adobe_analytics.enabled = false`) — exactly what `fetchOnly` does.

### The three XDM shapes

```jsonc
// Page view — s.t()
{ "eventType": "web.webpagedetails.pageViews",
  "web": { "webPageDetails": { "pageViews": { "value": 1 } } } }

// Link click — s.tl()
{ "eventType": "web.webInteraction.linkClicks",
  "web": { "webInteraction": { "name": "cta-hero", "type": "other",
                               "linkClicks": { "value": 1 } } } }

// Suppressed — no AA hit (but the Web SDK STILL injects web.webPageDetails.URL!)
{ "eventType": "decisioning.propositionFetch" }
```

### Deactivating AA collection

Because of the auto-injected URL, omitting the classifier is **not** enough — disable Analytics at the Edge:

```js
alloy("sendEvent", {
  xdm: { eventType: "decisioning.propositionFetch" },
  renderDecisions: true,
  // ↑ the Web SDK still auto-adds web.webPageDetails.URL here
  edgeConfigOverrides: {
    com_adobe_analytics: { enabled: false }   // the only deterministic off-switch
  }
})
// → Analytics records nothing; Target / AEP still receive the event in full.
```
