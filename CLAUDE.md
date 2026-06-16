# acdl_helper library

## Intention and basic architecture
- See [README.md](README.md)

## Documentation on plugin usage
- Every plugin hosts its own README.md in its folder in `src/plugins`

## Repo knowledge
- **ES Modules** project (`"type": "module"`), **no Babel** — modern JS only. **No runtime dependencies**.
- Entry `src/core/index.js` → webpack builds to `dist/acdl_helper.js`. `dist/` is gitignored.
- Plugins: `src/plugins/{name}/index.js`, loaded dynamically. A plugin default-exports a function returning `{ meta, impl(context) }` with `init`, optional `handle_event`, optional `provider`. Context gives `logger`, `config`, `event_prefix`, `acdl`, `catch`, `shared`.
- `__VERSION__` is injected from `package.json` `version` at build time. `package.json` `version` also feeds the Maven/CRX build (`npm_package_version`).
- Node ≥ 23 (see `.nvmrc`). Build needs Java 11 + Maven only for the CRX bundle.
- Build artifacts that ARE committed: `release/{version}/` (served via jsDelivr CDN) and `crx-package/{version}.zip` (AEM content package). Only `dist/` is gitignored.

## Code conventions
- **snake_case** for all variables and functions (e.g. `build_payload`, `is_obj`). camelCase only where an external API requires it (e.g. `adobeDataLayer`, `renderDecisions`, `webInteraction`).
- Match the surrounding file's style and comment density.

## Testing (required from now on)
- Test runner: **Node's built-in `node:test`** (zero dependencies). Tests live in **`tests/`** — NOT `test/` (gitignored). Run with `npm test` (`npm run test:watch` while developing).
- **Maintain good coverage.** Every behavior change must keep the suite green and add/adjust tests:
  - When changing existing behavior, first write **characterization tests** that lock the current behavior (they must pass before you edit code), then change code, then add tests for the new behavior.
  - Prefer testing the pure functions (`lib/*`) directly; stub `window.alloy` / `context` for plugin-level tests.

## Way of working
Open work is tracked in [BACKLOG.md](BACKLOG.md) (sections: IDEATION, FEATURES, BUGS, CHORES). When an item ships, **remove it from `BACKLOG.md`** and record it in `CHANGELOG.md` under its version — the backlog holds only open work, the changelog is the history of done work.

For any non-trivial change, follow these steps in order:
1. **Feature description** — capture the intent / problem and the desired outcome (add it to `BACKLOG.md` under the right section if not already there).
2. **Planning** — agree an approach before coding (plan mode for non-trivial work). Surface trade-offs and open decisions.
3. **Implementation** — small, focused edits matching existing conventions.
4. **Testing** — characterization tests first (lock current behavior), then implement, then tests for new behavior; `npm test` must be green.
5. **Documentation** — update the relevant plugin `README.md` and the main `README.md`.
6. **Changelog** — add an entry to `CHANGELOG.md` (Keep-a-Changelog format) and bump `package.json` `version` (semver). **Remove the shipped item from `BACKLOG.md`.**
7. **Delivery** — build artifacts and commit/push manually:
   - `npm run build:prod` (→ `dist/`) or `npm run build:crxbundle` (→ `dist/` + `release/{version}/` + `crx-package/{version}.zip`; needs Java 11 + Maven).
   - Commit source + `tests/` + docs + `CHANGELOG.md` + the built `release/{version}/` and `crx-package/{version}.zip`.
   - Push to **both** remotes: `Github` and `gitlab_divae`.
- Commit/push only when the user asks. Default working branch is `develop`.
