# BioScriptAI Sidebar — UI/UX Design Specification

This document summarizes the sidebar design. The canonical machine-readable spec is **`SIDEBAR_UI_SPEC.json`** (JSON schema).

---

## 1. Sidebar opening triggers

| Trigger | Behavior |
|--------|----------|
| **Hotkey** | Default `Ctrl+Shift+B` (configurable). Action: toggle sidebar; scope: global or current tab. |
| **Toolbar icon** | Click opens sidebar (not popup). Optional badge when a paper is loaded (e.g. count or dot). |
| **PDF detection** | When the active tab is a PDF: either **suggest only** (banner/toast/icon pulse) or **open sidebar** automatically. Configurable in options. |

---

## 2. Paper context loader

- **PDF**: Detected via viewer URL patterns (Chrome PDF viewer, PDF.js, blob, file). Parsing: DOM scrape of viewer and/or external service; fallback: screenshot OCR or user paste.
- **HTML**: Detected via main-content selectors (e.g. `article`, `[role=main]`, `.paper-content`) and optional domain allowlist. Parsing: content script DOM or Readability-style extraction.
- **Loader states**: `idle` → `detecting` → `loading` → `ready` | `unsupported` | `error`. Each state has a defined message and UI (spinner, retry, paste option).

---

## 3. Persistent workspace

- **Section**: Collapsible “Workspace” with two tabs: **Saved papers** and **Projects**.
- **Saved papers**: List items show title, authors, year; actions: open, remove, add to project. Empty state: “No saved papers. Save from the context bar or Zotero.”
- **Projects**: List items show name and paper count; actions: open, rename, delete. Empty state: “No projects. Create one to group papers.”
- Data persists in Chrome storage / IndexedDB and survives sessions.

---

## 4. Real-time question input area

- **Placeholder**: “Ask about the paper…”
- **Multiline** input (e.g. max 4 rows). Send: button + Enter (Enter sends; Shift+Enter new line).
- **States**: enabled (context ready), disabled (no context + hint), sending (spinner), error (retry).
- **Quick actions**: Optional chips, e.g. “Summarize this section”, “Explain this figure”, “Key findings”, “Methods in one sentence”.

---

## 5. Term highlighter & definition tooltip

- **Trigger**: Double-click term (or selection / hover-after-highlight / right-click; configurable).
- **Highlight**: Style: underline, background, or border; color from theme; optional persist after tooltip close.
- **Tooltip**: Position: above, below, sidebar panel, or inline; max width ~320px. Content: from LLM and/or local glossary; loading state: “Looking up…”
- **Tooltip layout**: Term (bold), definition body, optional source label. Interaction states: loading, loaded, error, no_definition.

---

## 6. Figure interpretation options

- **Visibility**: Shown when a figure is selected, or when an image is in context (configurable).
- **Preset options** (each maps to a prompt template):
  - Describe figure
  - Suggest caption
  - Summarize data
  - Infer methods
- **Custom**: Free-text input: “Or ask something specific about this figure…”

---

## 7. Sidebar layout (top → bottom)

1. **Header** — Title “BioScriptAI”, actions (options, collapse, clear context, refresh).
2. **Paper context bar** — Current paper title/source or loader state (idle/detecting/loading/ready/unsupported/error).
3. **Workspace** — Saved papers & projects (collapsible).
4. **Question input** — Multiline input + send + quick actions.
5. **Response panel** — Thread of user/assistant messages; streaming, complete, error states.
6. **Figure interpretation** — Options + custom question (collapsible, default collapsed).

---

## 8. Interaction states (global)

- **sidebar**: `closed` | `opening` | `open` | `closing`
- **context**: `idle` | `detecting` | `loading` | `ready` | `unsupported` | `error`
- **llm**: `idle` | `sending` | `streaming` | `done` | `error`
- **figureSelection**: `none` | `selected` | `interpreting`

These drive disabled states, spinners, and empty/error copy across components.

---

## 9. Theme tokens (optional)

Defined in `SIDEBAR_UI_SPEC.json` under `theme`: sidebar width (min/max), spacing, border radius, term highlight background. Use CSS variables in implementation.

---

**Schema file**: `docs/SIDEBAR_UI_SPEC.json`
