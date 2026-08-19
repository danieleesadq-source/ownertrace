# Quality Assurance & Manual Testing Guide

This document outlines the manual verification suite for OwnerTrace — ensuring UI rendering, interactivity, responsive layout, and error recovery function seamlessly alongside automated test suites.

Prerequisites: backend running (`pnpm --filter backend run dev`, port 5000) against the seeded database instance, frontend running (`pnpm --filter frontend run dev`, port 5173) with `frontend/.env`'s `VITE_API_URL` pointing at the backend.

## Core flow

- [ ] Empty state on load: inviting copy, example search chips visible
- [ ] Clicking an example chip triggers a search
- [ ] Typing a name/address and submitting triggers a search
- [ ] Loading state shows the graph-shaped skeleton, not a generic spinner/blank screen
- [ ] Populated graph renders with visibly separated nodes (not overlapping)
- [ ] Person nodes are circles, property nodes are rounded squares
- [ ] Flagged nodes show the glow + corner `!` badge; unflagged nodes don't
- [ ] Edges are visible and connect the correct nodes (no dangling/missing edges)
- [ ] Flagged edges pulse; clean edges are steady
- [ ] Hovering a node dims everything not connected to it
- [ ] Clicking a node opens the dossier panel with correct data for that entity
- [ ] Dossier shows risk score, risk level, flag explanation (if flagged), and transaction/ownership history
- [ ] Closing the dossier (X button or clicking canvas background) works
- [ ] Risk level filter (All/Flagged/Clean) actually changes what's rendered
- [ ] Recent searches populates with real queries from this session and re-triggers search on click
- [ ] Searching something with no matches shows a clear "no results" message, not a blank canvas or crash

## Error handling

- [ ] Stop the backend (`Ctrl+C` on the dev server), then search — a clear, plain-language error
      message appears (not a raw "fetch failed" or blank screen), with a working "Retry" button
- [ ] Restart the backend, hit Retry — the app recovers and shows real data again

## Responsive / mobile

- [ ] At mobile width (e.g. browser dev tools device toolbar, ~375px), the sidebar collapses
      into a drawer opened via the header search icon
- [ ] Mobile sidebar drawer shows search, filter, and recent searches; closing it works
- [ ] Selecting a node on mobile opens the dossier as a bottom drawer, not the desktop side panel
- [ ] Mobile dossier drawer is scrollable and closes cleanly

## Motion / accessibility

- [ ] With OS-level "reduce motion" enabled, flagged-node glow and edge pulsing are static
      (no animation), and the dossier panel opens without a slide animation
- [ ] Keyboard focus is visible on interactive elements (search input, filter buttons, retry button)

## Console hygiene

- [ ] No errors or warnings in the browser console during the full flow above
- [ ] No `localStorage`/`sessionStorage` calls show up in the Application/Storage devtools panel

---

## Automated test coverage (for reference — already run and passing)

- Backend integration tests (`pnpm --filter backend run test`): 32 tests against the real seeded
  database — search (normal/no-results/missing-param), entity lookup (flagged person/clean
  property/not-found), pattern detection (circular flip, witness-then-buyer, day-window
  filtering), the DB-unreachable graceful-error-handling path, entity-resolution/masking/column-
  mapping unit tests, and the CSV/manual import pipeline (preview, commit, re-import merge
  behavior, malformed CSV, manual entry sharing the same resolution logic).
- Frontend tests (`pnpm --filter frontend run test`): 9 tests — `filterGraph`'s risk-filter logic
  (including the edge-orphaning edge case) and `RiskScoreBar`'s score-to-label thresholds
  (including boundary values).

> **Heads up:** the import tests write real, persistent people/properties/transactions into the
> database (there's no "undo" for a `MERGE`-based import) — they use a random per-run suffix on
> every fabricated name so re-running the suite never collides with a previous run, but it does
> mean the database will accumulate test data every time `pnpm --filter backend run test` runs.
> Run `pnpm --filter backend run seed` afterward to restore the clean demo scenario before a real
> demo or screen recording.

## Import flow — manual checklist

- [ ] Upload a CSV with header names that don't match the target fields exactly (e.g.
      `purchaser_name`, `vendor_ssn`) and confirm the suggested mapping is reasonable
- [ ] Override a suggested mapping in the dropdown and confirm the preview updates
- [ ] Commit a valid CSV and confirm the summary numbers make sense, then search for one of the
      newly imported names and confirm it appears in the graph with correct edges
- [ ] Re-upload the *same* CSV and confirm people/properties merge (created counts drop to 0,
      merged counts match) rather than duplicating
- [ ] Upload a CSV missing a required column (or with a blank required cell) and confirm the
      affected rows are skipped with a clear reason, not a crash or a silent partial import
- [ ] Use the manual entry form to add a single transaction and confirm it's immediately
      searchable
- [ ] Enter a manual-entry buyer name that matches an existing person and confirm it merges
      rather than creating a duplicate
- [ ] Re-seed the database afterward (`pnpm --filter backend run seed`) if this was a real demo
      run, not just a test
