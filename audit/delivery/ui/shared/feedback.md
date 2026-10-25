# Modals, confirm dialogs, toasts, inline feedback

**Files:** `components/ui/Modal.tsx`, `ConfirmDialog.tsx`, `Drawer.tsx`, the sonner `Toaster` in `app/providers.tsx`
**Seen:** style guide ✅; usage from code 🔎

## Findings
- `window.confirm` is still used in 3 places:
  - `LogbookClient.tsx:168`
  - `InternshipClientParts.tsx:98` (apply)
  - `ProfileClient.tsx:643` (unsaved-changes guard)

  It's unstyled, ignores dark mode and breaks on some mobile browsers.
- `ConfirmDialog` exists, but only admin and the employer dashboard use it.
- Toasts are inconsistent. Some say "Saved", some say a full sentence, and some errors show raw API messages.

## Standards
| Situation | Use | Rule |
|---|---|---|
| Destructive or irreversible (delete, reject, withdraw, suspend) | `ConfirmDialog` (danger) | Name the object and the consequence: "Reject Ada Obi for Frontend Intern? They'll be emailed." The button says the verb ("Reject"), never "OK". |
| Leaving with unsaved changes | `ConfirmDialog` + a `beforeunload` handler | "Discard changes" / "Keep editing" |
| Multi-field input in context (feedback note, revision request) | `Modal` | Autofocus the first field; Esc cancels; Enter submits a single-line form |
| Detail without losing the list (applicant, logbook entry) | `Drawer` (right on desktop, bottom sheet on mobile) | Deep-linkable (`?applicant=<id>`) |
| Success | toast (4 s) | Past tense + what's next: "Application sent. We'll email you when GreenStack responds." |
| Recoverable error | inline banner near the action + **Retry** | Human message, with a technical detail toggle |
| Undoable action | toast with **Undo** (6 s) instead of a confirm | Archive, mark read, remove a saved internship |
| Long AI work | inline progress with a stage label | "Reading your CV… → Extracting skills… → Scoring 25 roles…" |

## Acceptance
- `grep -rn "window.confirm\|alert(" app components` returns nothing.
- Every modal: focus trap, Esc closes, focus returns to the trigger, and it's correct in both themes (the kit already does
  this; just use it).
