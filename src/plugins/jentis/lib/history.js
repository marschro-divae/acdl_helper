/**
 * State of the data layer AT an event — for live and for replayed events alike.
 *
 * Observed in AEM (ACDL 2.0.2, DOCS/FEATURES/jentis-bridge §7.5):
 * - `getState()` (also a listener's `this.getState`) returns the CURRENT state, so a replayed event would see
 *   later pushes;
 * - a listener receives a COPY of the pushed item — its position cannot be found by identity;
 * - the `adobeDataLayer` array keeps every data and event push (not function pushes), in push order, and
 *   events are delivered in that order (live and replayed);
 * - `push` updates the state and calls the listeners BEFORE it appends the item to the array (§7.6): a live
 *   event is not in the array yet when it is delivered — a replayed one is;
 * - merge rules: plain objects merge deeply, arrays merge by index, `undefined` and `null` delete the key.
 *
 * The cursor walks the array forward once, folding the state incrementally, and for each event moves on to
 * the next array item with the same `event` and `eventInfo`. Other scripts' pushes in between do not disturb
 * it; identical events are matched in order.
 *
 * A miss means a live event: the caller uses `this.getState()`, which is exact then. The event stays
 * **pending** — when its item is appended, it is folded but never matched, or the next identical event would
 * get this one's state. Pending events are found by content, not by position: a listener that pushes itself
 * (nested push) has its item appended before the outer one.
 */
const MAX_PENDING = 100 // only reached if another script rewrites the array — then items never show up

export function create_history_cursor(get_items) {
  let position = 0 // next array index not yet folded
  let state = {}
  const pending = [] // live events whose item was not in the array yet

  return {
    /** State right after `event` was pushed (its own data included), or `undefined` if not found. */
    state_at(event) {
      const items = get_items() || []
      for (let i = position; i < items.length; i++) {
        const item = items[i]
        state = apply_item(state, item)
        position = i + 1
        const live = pending.findIndex((pending_event) => same_event(item, pending_event))
        if (live >= 0) pending.splice(live, 1)
        else if (same_event(item, event)) return state
      }
      if (is_plain_object(event)) {
        pending.push(event)
        if (pending.length > MAX_PENDING) pending.shift()
      }
      return undefined
    },
  }
}

/** Fold one array item into the state (copy-on-write: earlier returned states are never mutated). */
export function apply_item(state, item) {
  if (!is_plain_object(item)) return state
  const { event: _event, eventInfo: _event_info, ...data } = item
  return Object.keys(data).length ? merge(state, data) : state
}

/** ACDL merge: deep for plain objects, by index for arrays, `undefined` / `null` delete. Returns a new value. */
export function merge(target, source) {
  if (Array.isArray(source)) {
    const result = Array.isArray(target) ? target.slice() : []
    source.forEach((value, i) => {
      if (value === undefined || value === null) return
      result[i] = merge(result[i], value)
    })
    return result
  }
  if (is_plain_object(source)) {
    const result = is_plain_object(target) ? { ...target } : {}
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null) delete result[key]
      else result[key] = merge(result[key], value)
    }
    return result
  }
  return source
}

/** Read a dotted path (`component.teaser-1`) from a state. */
export function get_path(state, path) {
  if (typeof path !== "string" || !path) return undefined
  return path.split(".").reduce((node, key) => (is_plain_object(node) ? node[key] : undefined), state)
}

function same_event(item, event) {
  return (
    is_plain_object(item) &&
    is_plain_object(event) &&
    item.event === event.event &&
    stable_json(item.eventInfo) === stable_json(event.eventInfo)
  )
}

function stable_json(value) {
  if (Array.isArray(value)) return `[${value.map(stable_json).join(",")}]`
  if (is_plain_object(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable_json(value[k])}`)
      .join(",")}}`
  }
  return JSON.stringify(value === undefined ? null : value)
}

function is_plain_object(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}
