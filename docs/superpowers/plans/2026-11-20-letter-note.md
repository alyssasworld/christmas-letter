# Letter Note + Smaller Credit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An optional 60-character handwritten note under the red greeting (live letter + GIF), and a smaller "made by Loveaction" credit.

**Architecture:** The note is a third text block drawn by `drawText` in `src/render/letterScene.ts`, laid out by the pure helpers in `src/render/text.ts`, edited through the same invisible-button + overlay-field pattern the message and name use in `src/screens/letter.ts`.

**Tech Stack:** Vite + TypeScript, canvas 2D, Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-11-20-letter-note-design.md`

## Global Constraints

- Note: max 60 characters, wrapped at 30 columns, max 2 lines, same `sanitize` as the message.
- Note ink `#2b2b2b` (existing `INK`), same lean (`SKEW`) and wobble as the sign-off, glyph size = 0.6 x the greeting's.
- Empty-note prompt text is exactly `Add a little note`, drawn in `FAINT` only on the live letter, never in the GIF.
- Hint copy becomes exactly `Tap the message, note or your name to edit` (pencil svg stays).
- Persist as localStorage key `note` via `prefs` (default `''`); "Make another" clears it.
- An empty note must leave the greeting's size exactly as today.
- Credit glyph height 7 art px (was 10).
- Branch: `phase-7-polish` (already holds the uncommitted footer + photo-size fixes; commit those first, separately).

## Review Focus

- A 3-line greeting + 2-line note + long name on the 320x568 portrait letter: everything fits, no overlap with the sign-off (Task 3 e2e).
- Note made only of unsupported characters (emoji) sanitises to empty and shows the prompt, not a blank box (Task 1 unit).
- Saving the GIF while the note field is open includes the typed note (Task 3: `stop(true)` already runs first; e2e asserts the note persisted).
- Empty note: greeting font size identical to before the feature (Task 1 unit on `fitText` with `noteRows = 0`, Task 3 e2e compares `data-font-px` with/without).
- Reload restores the saved note (Task 3 e2e).

---

### Task 0: Commit the earlier fixes

- [ ] `git add src/assets/manifest.ts src/style.css && git commit -m "Fix footer link alignment; size wide photos by height"`

### Task 1: Note text rules

**Files:**
- Modify: `src/render/text.ts`
- Test: `tests/unit/text.test.ts`

**Interfaces:**
- Produces: `NOTE_COLS = 30`, `NOTE_ROWS = 2`, `MAX_NOTE = 60`, `NOTE_SCALE = 0.6`; `clampNote(text: string): string`; `wrapMessage(text, cols)` reused for note wrapping with `NOTE_COLS`; `fitText(lines, measure, areaW, areaH, noteRows = 0)` where `lines` may include note lines and `measure` returns their width already multiplied by `NOTE_SCALE`.

- [ ] **Step 1: Failing tests**

```ts
describe('note', () => {
  it('clampNote caps at 60 chars and 2 lines of 30', () => {
    const t = clampNote('word '.repeat(40));
    expect(t.length).toBeLessThanOrEqual(60);
    expect(wrapMessage(t, NOTE_COLS).length).toBeLessThanOrEqual(NOTE_ROWS);
  });
  it('emoji-only note sanitises to empty', () => expect(clampNote('🎄🎅')).toBe(''));
});
// in describe('fitText'):
it('noteRows = 0 gives the same size as before', () =>
  expect(fitText(['hi'], measure, 10000, 300, 0)).toEqual(fitText(['hi'], measure, 10000, 300)));
it('reserves height for note rows', () =>
  expect(fitText(['hi'], measure, 10000, 300, 2).n).toBeLessThanOrEqual(fitText(['hi'], measure, 10000, 300).n));
```

- [ ] **Step 2:** `npx vitest run tests/unit/text.test.ts` → FAIL (`clampNote` not exported).
- [ ] **Step 3:** Implement. `clampNote` mirrors `clampMessage` with 60/30/2. In `fitText`, height becomes `(MAX_ROWS + 1) * LINE_H + noteRows * LINE_H * NOTE_SCALE + PAD_Y` (plus a gap of `0.25 * LINE_H` when `noteRows > 0`).
- [ ] **Step 4:** `npx vitest run tests/unit/text.test.ts` → PASS.
- [ ] **Step 5:** Commit `Letter note: text rules`.

### Task 2: Draw the note and the smaller credit

**Files:**
- Modify: `src/render/letterScene.ts`, `src/render/gif.ts`
- Test: `tests/unit/letter.test.ts` (only if it calls `renderStatic`/`drawText`; update calls), `tests/unit/gif.test.ts` (update `Job` fixtures with `note`)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `drawText(ctx, o, s, message, name, note, skip?: 'message' | 'note' | 'name', prompt = false): TextInfo`
  - `renderStatic(cv, img, o, s, message, name, note, skip?, prompt = false)` (same new params, passed through)
  - `TextInfo` gains `note: Rect` (snug around drawn note, or around the prompt when empty and `prompt`; zero-height at the note's position otherwise) and `noteEdit: Rect` (room for 2 note lines, full text width).
  - `Job` in `gif.ts` gains `note: string`; GIF calls `renderStatic` with `prompt = false`.

- [ ] **Step 1:** Note lines (`wrapMessage(note, NOTE_COLS)`, seeds `21 + i`) are laid out with `layoutLine` at the native size and passed to `fitText` with widths x `NOTE_SCALE`, `noteRows = noteLines.length` (0 when empty, even if `prompt`: the prompt must not change the size). Draw at glyph scale `n * NOTE_SCALE` (round to a whole device px when `n * NOTE_SCALE >= 1`, else fractional), ink `INK`, starting one `0.25 * LINE_H * n` gap below the last drawn message line, left-aligned with the message. Empty + `prompt`: draw `Add a little note` the same way in `FAINT`. Skip the note when `skip === 'note'`.
- [ ] **Step 2:** `drawCredit`: replace the `10 * s` glyph-height cap with `7 * s`.
- [ ] **Step 3:** `gif.ts`: thread `note` through `Job` → `renderStatic(..., note)`.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` → PASS (fix fixtures in existing unit tests for the new parameter).
- [ ] **Step 5:** Commit `Letter note: drawing; smaller credit`.

### Task 3: Edit the note on the letter screen

**Files:**
- Modify: `index.html`, `src/state.ts`, `src/screens/letter.ts`, `src/style.css` (only if `#edit-note` needs adding to the `#edit-message, #edit-name` rules)
- Test: `tests/e2e/letter.spec.ts`

**Interfaces:**
- Consumes: Task 2 `renderStatic`/`TextInfo.note`/`noteEdit`, Task 1 `clampNote`, `MAX_NOTE`, `NOTE_COLS`, `NOTE_ROWS`.
- Produces: DOM ids `edit-note-btn` (class `edit-hit`, `aria-label="Edit note"`), `edit-note` (`<input>`, `maxlength="60"`, `aria-label="Note"`, `aria-describedby="edit-count"`, `spellcheck="false"`, `autocomplete="off"`); `prefs.note: string`.

- [ ] **Step 1: Failing e2e** (in `letter editing`):

```ts
test('note: edits, fits on the smallest letter, persists, and an empty note keeps the greeting size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?screen=letter');
  const canvas = page.locator('#letter');
  const before = await canvas.getAttribute('data-font-px');
  await page.click('#edit-message-btn');
  await page.fill('#edit-message', 'Wishing you all a wonderful holiday full of joy and cheer');
  await page.keyboard.press('Enter');
  await page.click('#edit-note-btn');
  await page.fill('#edit-note', 'n'.repeat(80));
  await expect(page.locator('#edit-note')).toHaveValue(/^.{1,60}$/);
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-text-fits', 'true');
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('shake-a-memory:note'))).toHaveLength(60);
  // empty note: same greeting size as the untouched default letter
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect(await canvas.getAttribute('data-font-px')).toBe(before);
  await expect(page.locator('#letter-hint')).toHaveText('Tap the message, note or your name to edit');
});
```

Also add `'edit-note-btn'` to the id loop in `the hint and edit boxes are there…`, and in `Make another confirms, clears…` assert `localStorage.getItem('shake-a-memory:note')` is `''` afterwards.

- [ ] **Step 2:** `npx playwright test tests/e2e/letter.spec.ts -g note` → FAIL (`#edit-note-btn` not found).
- [ ] **Step 3:** Implement: `prefs.note` (getter default `''`); markup next to the name button/input; in `letter.ts` extend `editing`/`field()`/`edit()`/`stop()`/the input-listener loop/the click handlers to `'note'` (counter `${v.length}/${MAX_NOTE}`, field rect `info.noteEdit`, clamp with `clampNote`); `renderLayer` passes `note` and `prompt = true` and places `edit-note-btn` over `info.note`; `describe()` includes the note when set; Save GIF passes `note`; Make another clears `prefs.note = note = ''`; hint copy in `index.html`; in `hintHeight` (`letterScene.ts`) raise the `~40 chars` estimate to 46 so the longer hint's wrap is predicted correctly.
- [ ] **Step 4:** `npm run lint && npm test && npx playwright test tests/e2e/letter.spec.ts tests/e2e/viewports.spec.ts` → all pass.
- [ ] **Step 5:** Screenshot the letter with a note at 390x844@3 and 1440x900@2 (portrait + landscape) and check by eye: note under the greeting, clear of the sign-off, credit visibly smaller.
- [ ] **Step 6:** Commit `Letter note: editing on the letter screen`.
