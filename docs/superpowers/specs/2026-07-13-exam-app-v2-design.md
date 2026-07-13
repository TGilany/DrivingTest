# Driving Exam App v2 — Design

**Date:** 2026-07-13
**Status:** Approved
**Builds on:** `2026-07-13-driving-refresher-exam-design.md` (v1, shipped)

## Features

### 1. Reviewable past exams

- `ExamResult` gains a full snapshot: `{ date, mistakes, passed, questions: ExamQuestion[], picks: Record<number, number> }`.
- Same storage key `refresher-exam/history/v1`. Old entries (no `questions`) still render in the history table but are not clickable.
- Home history rows with snapshots are clickable ("View") → App reconstructs an `ExamState` (`{version:1, deadline: entry.date, questions, picks, locked: []}`) and shows the existing Results screen. Opening a past exam records nothing (no `finish()` call).

### 2. Mistake retry seeding

- On exam creation, build the mistake pool: ids of every question graded wrong (or unanswered) across all history snapshots, deduped, that still exist in the bank.
- Pick up to 2 ids from the pool at random (1 if pool has 1; 0 if empty). Each occupies a slot in its own category; remaining slots fill randomly as before. No duplicate questions; 10/4/4/2 proportions unchanged; total stays 20.
- Implementation: `sampleExam(bank, seed, retryIds?)` — retry ids claim their category slots first; the random fill excludes them. `createExam(bank, seed, now, history?)` derives retry ids from history.

### 3. Dark mode

- `styles.css` refactored to CSS variables: `:root` (light) and `[data-theme="dark"]` palettes covering background, card, text, borders, answer states, banners.
- Theme resolution: localStorage `refresher-exam/theme` (`'light' | 'dark'`) wins; if unset, follow `prefers-color-scheme`. Applied as `data-theme` attribute on `<html>`.
- Sun/moon toggle button visible on all screens (top-right); click flips theme and persists it.
- New module `src/lib/theme.ts`: `getTheme()`, `setTheme(t)`, `initTheme()`.

### 4. Layout

- `#root` max-width 760px → 1100px; question card padding/type scaled up (question ~1.35rem, answers ~1.05rem, larger paddings).
- Progress strip: `flex-wrap: nowrap` — all 20 dots on one line (20×32px + gaps ≈ 754px, fits).
- Exam footer button order: `← Previous`, `Next →`, `Finish exam` (finish last/rightmost).

## Constraints carried from v1

- No git. No E2E test suite (manual smoke only). localStorage persistence, versioned keys. React 19 + Vite + TS, Vitest.

## Testing

- Vitest: retry seeding (injects ≤2 wrong ids into correct categories, no dupes, proportions hold, empty/1-item pool, retry id not in bank ignored), history snapshot round-trip with picks/questions, theme get/set/init fallback.
- Manual browser smoke: toggle theme both ways + persistence, history row opens past exam review, new exam contains a seeded past mistake, one-line dots, footer order.

## Out of scope

- Deleting/clearing history, exporting results, spaced-repetition weighting beyond the 2-question seed.
