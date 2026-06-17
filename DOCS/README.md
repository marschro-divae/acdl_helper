# DOCS — persistent feature & refactoring record

This folder is the **long-lived memory of *why* the code looks the way it does**.

`BACKLOG.md` only holds *open* work — entries are deleted the moment they ship.
`CHANGELOG.md` records *what* shipped, in one terse line per version.
Neither captures the **requirements, the context, the things we tried that didn't
work, and the reasoning** behind a change. That is what lives here, and it persists.

## Layout

```
DOCS/
  README.md                       ← this file (the convention)
  FEATURES/
    <slug>/                       ← one folder per feature
      README.md                   ← requirements + context + outcome
      summary.html                ← optional reporting slide deck (standard name)
      *.png / ...                 ← any other assets (diagrams, payload samples)
  REFACTORING/
    <slug>/                       ← one folder per refactor, same shape
      README.md
```

- **`<slug>`** is short, kebab-case, and stable (e.g. `xdmtracker-single-page-view`).
- Every entry gets its own folder so its assets (diagrams, presentations,
  payload samples) live next to its write-up.
- If an entry has a presentation/slide deck, name it **`summary.html`** — so anyone
  who just wants the at-a-glance story knows exactly where to click.

## When to add an entry

At the **start** of any non-trivial feature or refactor — when you'd otherwise
just add a line to `BACKLOG.md`. Capture the intent up front, then keep the
entry's `README.md` updated through implementation so it reads as the finished
story once the work ships.

## What an entry's README should contain

1. **Status & links** — version it shipped in, related backlog/changelog lines.
2. **Problem / motivation** — the symptom, who it hurt, why it mattered.
3. **Investigation** — how we diagnosed it (and how we *proved* it, not just docs).
4. **What didn't work** — rejected approaches and *why* — this is the part that
   saves the next person weeks.
5. **The solution** — what we built and the decisive design decisions.
6. **Outcome** — the measurable result.

> Use the existing entry, [`FEATURES/xdmtracker-single-page-view/`](FEATURES/xdmtracker-single-page-view/),
> as the template.
