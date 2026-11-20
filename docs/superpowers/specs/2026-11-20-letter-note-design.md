# Letter note + smaller credit (short design)

## Intent
Let the sender add a short personal note under the red greeting so the GIF letter feels written for one person. Also make the "made by Loveaction" credit quieter.

## Goals
- Optional note, max 60 characters, up to 2 lines, between the greeting and "Love, Name".
- In the saved GIF and the live letter, on every viewport (portrait and landscape).
- Credit drawn smaller (about 7 art px tall instead of 10).

## Non-goals
- Long notes, rich text, emoji beyond what Pixelta supports.
- Changing the greeting's limits (3 x 18) or the letter's size.

## Anti-goals
- The note must never overflow the letter or overlap the sign-off.
- The empty-note prompt must never appear in the GIF.
- The greeting must not shrink noticeably because of an empty note.

## Approaches
- **Note as its own smaller, dark handwritten block, fitted together with the greeting (picked).** It reads as a personal line under a headline, and the greeting stays the star.
- Note at the same size as the greeting: rejected, it would make the greeting shrink a lot on phones (the portrait letter is already width-limited).
- Note in an HTML layer only: rejected, it has to be in the GIF.

## Design (owner decisions)
- Short note: 60 characters (owner: "keep it short").
- Works like the greeting and name: tap to edit, dashed box that pulses until the first edit, Enter saves, Esc cancels, remembered in localStorage (`note`), cleared by "Make another".
- Empty: a faint "Add a little note" prompt in the app only (like the dashed boxes), never drawn into the GIF.

## Builder's calls (Claude's proposals)
- Same handwriting wobble and lean as the sign-off, ink colour `#2b2b2b`, about 0.6x the greeting size, kept on whole device pixels where possible so Pixelta stays crisp.
- Wraps at about 30 characters per line, 2 lines max. Same sanitising as the message.
- Text fitting reserves room for the note only when there is one, so an empty note leaves the greeting's size unchanged.
- Hint line becomes "Tap the message, note or your name to edit"; the screen-reader description includes the note.
- Unit tests for note clamping/wrapping and for fitting with a 2-line note; the e2e test checks the note edits and fits on every viewport.
