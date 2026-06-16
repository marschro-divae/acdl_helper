/**
 * Assembles the full alloy("sendEvent", ...) payload envelope.
 *
 * Branches on def.pageView:
 *   true  → page view semantics (web.webPageDetails.pageViews)
 *   false → link click semantics (web.webInteraction + linkClicks)  [default]
 *
 * Send options precedence: def.X → send_opts.X → hardcoded default
 */
import { build_xdm } from "./xdm-builder.js"

var VALID_INTERACTION_TYPES = ["other", "download", "exit"]

export function build_payload(event_key, def, cmp, send_opts, defaults, logger) {
  // Two-pass XDM build: defaults first (base layer), then event definition on top (delta).
  // fetchOnly prefetches skip the defaults: they never reach Adobe Analytics and a
  // personalization decision does not use the AA variables, so the call stays minimal and
  // is not mistaken for a page view when someone inspects the collect payload.
  var xdm = defaults && def.fetchOnly !== true ? build_xdm(defaults, cmp, logger) : {}
  xdm = build_xdm(def, cmp, logger, xdm)

  if (!xdm.web) xdm.web = {}

  if (def.pageView === true) {
    // Page view semantics (s.t() equivalent)
    if (!xdm.web.webPageDetails) xdm.web.webPageDetails = {}
    xdm.web.webPageDetails.pageViews = { value: 1 }
  } else if (def.fetchOnly === true) {
    // Personalization prefetch — neither a page view nor a link click.
    // Sent as decisioning.propositionFetch, which Adobe Analytics IGNORES, so it
    // never becomes an AA hit (no page-view inflation, no bounce-rate impact).
    // Intentionally emits NO webPageDetails.pageViews and NO webInteraction:
    // the page-view vs link decision is made by those fields, not by eventType.
  } else {
    // Link click semantics (s.tl() equivalent) — default
    if (!xdm.web.webInteraction) xdm.web.webInteraction = {}

    xdm.web.webInteraction.name = def.webInteractionName || event_key

    var interaction_type = def.webInteractionType || "other"
    if (VALID_INTERACTION_TYPES.indexOf(interaction_type) < 0) {
      logger.warning(
        'invalid webInteractionType "' + interaction_type +
        '", must be one of: ' + VALID_INTERACTION_TYPES.join(", ") +
        '. Falling back to "other"'
      )
      interaction_type = "other"
    }
    xdm.web.webInteraction.type = interaction_type

    // Merge to preserve any extra linkClicks properties set via custom xdm, then ensure value: 1
    xdm.web.webInteraction.linkClicks = Object.assign(
      {},
      xdm.web.webInteraction.linkClicks || {},
      { value: 1 }
    )
  }

  // eventType: definition-only, defaults based on the pageView / fetchOnly flags
  var default_event_type = def.pageView === true
    ? "web.webpagedetails.pageViews"
    : def.fetchOnly === true
    ? "decisioning.propositionFetch"
    : "web.webInteraction.linkClicks"

  var resolved_event_type = def.eventType || default_event_type
  if (def.pageView === true && resolved_event_type !== "web.webpagedetails.pageViews") {
    logger.warning(
      'pageView is true but eventType is "' + resolved_event_type +
      '" — expected "web.webpagedetails.pageViews". Payload will be sent as configured.'
    )
  }

  // Send options: def.X → send_opts.X → hardcoded default (false)
  // The != null check distinguishes "explicitly set to false" from "not set at all"
  var payload = {
    xdm: xdm,
    type: resolved_event_type,
    renderDecisions: !!(def.renderDecisions != null ? def.renderDecisions : send_opts.renderDecisions),
    documentUnloading: !!(def.documentUnloading != null ? def.documentUnloading : send_opts.documentUnloading),
  }

  var data = def.data || send_opts.data
  if (data) payload.data = data

  // Personalization options (Adobe Target / Offer Decisioning), passed straight
  // through to alloy("sendEvent"). Supports e.g. { sendDisplayEvent: false } on a
  // prefetch and { includeRenderedPropositions: true } on the page view, so the
  // display notification is folded into a single hit instead of a second one.
  var personalization = def.personalization || send_opts.personalization
  if (personalization) payload.personalization = personalization

  // edgeConfigOverrides: user overrides + datastreamId + fetchOnly's Analytics suppression.
  //
  // IMPORTANT: Adobe Analytics decides page-view-vs-link purely from web.webPageDetails /
  // web.webInteraction — NOT from eventType. The Web SDK auto-collects web.webPageDetails.URL
  // on every event, so a fetchOnly prefetch is still counted as a (second) page view, and the
  // decisioning.propositionFetch type does NOT reliably make AA drop it. The only deterministic
  // fix is to disable the Adobe Analytics service for this event at the Edge — Target/AEP still
  // receive it, only Adobe Analytics is skipped.
  var edge_overrides = Object.assign({}, def.edgeConfigOverrides || send_opts.edgeConfigOverrides || {})
  var ds = def.datastreamId || send_opts.datastreamId
  if (ds) edge_overrides.datastreamId = ds
  if (def.fetchOnly === true && edge_overrides.com_adobe_analytics === undefined) {
    edge_overrides.com_adobe_analytics = { enabled: false }
  }
  if (Object.keys(edge_overrides).length > 0) payload.edgeConfigOverrides = edge_overrides

  return payload
}
