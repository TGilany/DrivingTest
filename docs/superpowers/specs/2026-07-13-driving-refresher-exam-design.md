# Driving Refresher Exam App — Design

**Date:** 2026-07-13
**Status:** Approved

## Purpose

Interactive practice exam in English for the Israeli driving refresher course (השתלמות רענון בנהיגה). Simulates the course exam: 20 questions, 30 minutes, pass with up to 4 mistakes.

## Requirements

- React + Vite SPA, fully static, run locally (`npm run dev` / `npm run preview`). Single stable local URL.
- Question pool: full official Ministry of Transport theory question bank (1802 questions) from data.gov.il (dataset `tqhe`, resource `bf7cb748-f220-474b-a4d5-2d59f93db28d`, CC-BY), translated to English.
- Each question: exactly 4 answers, 1 correct, plus an English explanation of the correct answer (grounded in the refresher course booklet topics where possible, otherwise standard Israeli traffic-law knowledge).
- Exam: 20 questions per exam, sampled proportionally by category — traffic laws ×10, safety ×4, traffic signs ×4, vehicle knowledge ×2. Sampling draws from the entire bank regardless of license class (`licenses` kept in data for a possible future filter). Answer order shuffled per question.
- Timer: 30 minutes, counts down, auto-submits at zero. Early finish allowed via "Finish Exam".
- Check-answer: per question, after picking an answer, "Check" reveals correct/wrong plus explanation and **locks** the question; result counts toward the final score. Unchecked questions are graded at submit.
- Scoring: ≤4 mistakes (including unanswered) = PASS, ≥5 = FAIL.
- "New Exam" button available at any time (confirm if exam in progress).
- Persistence: in-progress exam (question ids, answer order seed, picks, locked/checked state, timer deadline as absolute timestamp) stored in localStorage. Refresh or reopen resumes exactly where left off. Past results history also in localStorage.
- 599 questions include an image (traffic signs / scenarios); images downloaded at build time and bundled locally under `public/images/` — no runtime dependency on gov.il.

## Architecture

### Data pipeline (one-off, `scripts/`)

1. `fetch-bank` — pull all 1802 records from CKAN `datastore_search` (JSON), parse:
   - id (from `title2` prefix), Hebrew question text, 4 answers from `description4` HTML `<li>` items, correct answer via `id="correctAnswerNNNN"` span, category, license classes (`«B»` etc.), image URL if present.
   - Output: `scripts/bank.he.json`.
2. `fetch-images` — download all referenced images with browser-like headers (verified working) into `public/images/<id>.jpg`. Playwright fallback if any URL blocked.
3. Translation — parallel translation agents convert each question + 4 answers to English and write a 1–2 sentence explanation. Merged output: `src/data/questions.json`:
   ```json
   { "id": 1759, "category": "traffic-laws", "question": "...", "answers": ["...", "...", "...", "..."], "correct": 2, "explanation": "...", "image": "1759.jpg" | null, "licenses": ["C1","C","D"] }
   ```
   `correct` is the index in the canonical (unshuffled) answers array.
4. Booklet: attempt Scribd scrape via Playwright for explanation grounding; on failure, explanations rely on standard theory material. Booklet content is a quality input, not a runtime dependency.

### App structure (`src/`)

- `data/questions.json` — full translated bank (bundled; ~1–2 MB, fine for local static app).
- `lib/exam.ts` — pure logic: `createExam(bank, seed)` (proportional sampling + answer shuffle), `grade(exam, picks)`, mistake counting, pass/fail.
- `lib/storage.ts` — localStorage load/save of `ExamState` and results history; versioned key.
- `lib/timer.ts` — deadline-based countdown (stores absolute end timestamp; resume-safe).
- `components/` — `HomeScreen`, `ExamScreen`, `QuestionCard` (question, image, 4 options, Check button, explanation panel), `TimerBar`, `ProgressStrip` (20 dots: unanswered/answered/checked-right/checked-wrong), `ResultsScreen` (pass/fail banner, per-question review with explanations).
- `App.tsx` — screen state machine: `home → exam → results`, driven by stored state (auto-resume into `exam` if unfinished exam exists).

### Data flow

Start → sample 20 ids + shuffle seeds → persist `ExamState` → user answers/checks (each action persisted) → timer zero or Finish → grade → persist result, clear in-progress state → results screen.

### Error handling

- Corrupt/old localStorage → discard state, fresh home screen (versioned schema key).
- Timer resume past deadline → auto-submit immediately on load.
- Missing image file → question renders without image (alt text), no crash.

## Testing

- Vitest: sampling (category proportions, no duplicates, seed-stable), grading (boundary: 4 mistakes pass / 5 fail; unanswered = mistake), storage round-trip + version invalidation, timer resume (expired deadline → submit).
- Manual Playwright pass over UI: start, answer, check, refresh-resume, finish, new exam.

## Out of scope

- Deployment/hosting (local only for now).
- Hebrew/other language UI.
- User accounts, server, analytics.
