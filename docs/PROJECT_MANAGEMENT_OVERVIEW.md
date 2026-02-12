# BioScriptAI v2.0 — Project Management Flow Overview

High-level summary of project management flows, UI states, and where LLM prompts are used. For full definitions see the JSON and prompt docs below.

---

## Flows and UI States

| Flow | Trigger | Main UI states | LLM hooks |
|------|---------|----------------|-----------|
| **Create research project** | CTA in empty projects / header action | `modal.create_project` → `sidebar.workspace.projects` | — |
| **Add papers to project** | Paper item “Add to project” / context bar “Save to project” | `modal.add_paper_to_project` → `sidebar.workspace.papers` | — |
| **Tagging and annotating** | “Edit tags” / “Add annotation” on a paper | `modal.edit_tags`, `modal.add_annotation` → `sidebar.workspace.paper_detail` | Optional: tag suggestions |
| **View project overview** | Click project in list | `sidebar.workspace.project_detail` | Optional: project overview insight |
| **Export project bibliography** | “Export” on project / project detail | `modal.export_bibliography` | — |
| **Recommend next papers** | “Recommend” on project | `modal.recommendations` (after loading) | Required: recommend_next_papers |

---

## UI state reference (from JSON)

- **Sidebar:** `sidebar.workspace.active_tab`, `sidebar.workspace.papers`, `sidebar.workspace.projects`, `sidebar.workspace.project_detail`, `sidebar.workspace.paper_detail`, `sidebar.paper_context_bar`
- **Modals:** `modal.create_project`, `modal.rename_project`, `modal.delete_project_confirm`, `modal.add_paper_to_project`, `modal.edit_tags`, `modal.add_annotation`, `modal.export_bibliography`, `modal.recommendations`
- **Global:** `global.toast`

---

## LLM prompt hooks

| Hook id | Prompt ref | When |
|---------|------------|------|
| `tag_suggestions` | suggest_tags_for_paper | Optional (edit tags modal) |
| `project_overview_insight` | project_overview_insight | Optional (project detail view) |
| `recommend_next_papers` | recommend_next_papers | Required (recommend flow) |

---

## File reference

- **Workflows (JSON):** `docs/PROJECT_MANAGEMENT_FLOWS.json` — steps, actions, API calls, transitions, `llm_prompt_hooks` per workflow.
- **Prompt templates:** `docs/PROJECT_MANAGEMENT_PROMPTS.md` — system/user text and examples for each hook.
