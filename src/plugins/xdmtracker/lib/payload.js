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
  // Two-pass XDM build: defaults first (base layer), then event definition on top (delta)
  var xdm = defaults ? build_xdm(defaults, cmp, logger) : {}
  xdm = build_xdm(def, cmp, logger, xdm)

  if (!xdm.web) xdm.web = {}

  if (def.pageView === true) {
    // Page view semantics (s.t() equivalent)
    if (!xdm.web.webPageDetails) xdm.web.webPageDetails = {}
    xdm.web.webPageDetails.pageViews = { value: 1 }
  } else {
    // Link click semantics (s.tl() equivalent) — default
    if (!xdm.web.webInteraction) xdm.web.webInteraction = {}

    xdm.web.webInteraction.name = def.webInteractionName || event_key

    var interaction_type = def.webInteractionType || "other"
    if (VALID_INTERACTION_TYPES.indexOf(interaction_type) < 0) {
      logger.warn(
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

  // eventType: definition-only, defaults based on pageView flag
  var default_event_type = def.pageView === true
    ? "web.webpagedetails.pageViews"
    : "web.webInteraction.linkClicks"

  var resolved_event_type = def.eventType || default_event_type
  if (def.pageView === true && resolved_event_type !== "web.webpagedetails.pageViews") {
    logger.warn(
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

  var ds = def.datastreamId || send_opts.datastreamId
  if (ds) payload.edgeConfigOverrides = { datastreamId: ds }

  var data = def.data || send_opts.data
  if (data) payload.data = data

  return payload
}
