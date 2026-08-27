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

- _(no known open bugs)_

## CHORES

- **CI**: run `npm test` automatically on push / merge request (GitLab + GitHub).
- **.gitignore**: ignore Web Debugger / Assurance `*.json` exports so they can't be committed accidentally.
