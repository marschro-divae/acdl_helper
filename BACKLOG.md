# Backlog

Planned and potential work for acdl_helper, grouped by type.

**Lifecycle:** when an item is implemented (feature/chore) or fixed (bug), it is **removed from this file entirely** and recorded in [CHANGELOG.md](/CHANGELOG.md) under the version that ships it. This file therefore only ever contains *open* work; the CHANGELOG is the history of *done* work.

Sections:
- **IDEATION** — early ideas, not yet committed to. Promote to FEATURES once agreed.
- **FEATURES** — agreed enhancements to build.
- **BUGS** — known defects to fix.
- **CHORES** — maintenance, tooling, docs, refactors.

---

## IDEATION

- _(add ideas here before they become committed features)_

## FEATURES

- **xdmtracker: render named decision scopes / surfaces.** Today `fetchOnly` + `renderDecisions` fully automate the global `__view__` scope (Target VEC / global-mbox), but named scopes/surfaces are only *requested* — the Web SDK does not auto-render them and the plugin does not expose the response. Add a way to receive rendered/returned propositions (e.g. `track()` returning the alloy promise, or a render callback) so named scopes can be rendered and their display notifications emitted.

## BUGS

- **`catch(event).get()` throws a `TypeError` on non-ACDL events** (`get` is `undefined`); the README promises only a warning. Fix with the resolver migration below (1.12.0). Found in the jentis review: [DOCS/FEATURES/jentis-bridge §7.3](DOCS/FEATURES/jentis-bridge/README.md) point 14.

## CHORES

- **1.12.0: migrate existing users onto the 1.11.0 core parts** — `event_catcher` / `catch`, `page` (matcher + resolver) and `xdmtracker` (resolver, `subscribe`, drop the `$type` shim), `register_plugin_event_handler` onto `subscribe`; then rename or really share `context.shared` and replace the five `update_object` copies (core, `page`, `cleanup`, `user`, `usercentrics`). Characterization tests first. Plan: [DOCS/FEATURES/jentis-bridge §8 follow-up](DOCS/FEATURES/jentis-bridge/README.md).
- **CI**: run `npm test` automatically on push / merge request (GitLab + GitHub).
- **.gitignore**: ignore Web Debugger / Assurance `*.json` exports so they can't be committed accidentally.
