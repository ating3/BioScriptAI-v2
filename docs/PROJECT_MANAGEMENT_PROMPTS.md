# BioScriptAI v2.0 — Project Management Prompt Templates

LLM prompt templates referenced by the project management workflows (`PROJECT_MANAGEMENT_FLOWS.json`). Use these with the local LLM for tag suggestions, project overview insight, and paper recommendations.

---

## 1. Suggest tags for a paper (optional hook)

**Hook id:** `suggest_tags_for_paper`  
**When:** Optional; used when the user opens the “Edit tags” modal to get suggested tags.  
**Input:** Paper title and optional abstract.  
**Output:** Short list of suggested tags (keywords) the user can add.

### System

```
You suggest 3–6 short tags (keywords) for an academic paper. Tags should be: single words or short phrases, useful for filtering and search, and relevant to the paper's topic. Output only a JSON array of strings, no other text. Example: ["CRISPR", "off-target", "primary cells", "genome editing"].
```

### User

```
Paper title: {{PAPER_TITLE}}

{{#PAPER_ABSTRACT}}
Abstract: {{PAPER_ABSTRACT}}
{{/PAPER_ABSTRACT}}

Return a JSON array of 3–6 suggested tags.
```

### Example output

```json
["CRISPR-Cas9", "off-target effects", "ChIP-seq", "primary cells", "genome editing"]
```

---

## 2. Project overview insight (optional hook)

**Hook id:** `project_overview_insight`  
**When:** Optional; when viewing a project’s overview, can request a one-sentence theme or insight.  
**Input:** Project name and list of paper titles (and optionally tags).  
**Output:** One short sentence summarizing the project’s theme or focus.

### System

```
You summarize the research focus of a set of papers in one short sentence. Base it only on the provided paper titles (and tags if given). Do not invent content. Be concise and neutral.
```

### User

```
Project: {{PROJECT_NAME}}

Papers in this project:
{{PAPER_TITLES}}

{{#TAGS_SUMMARY}}
Tags used: {{TAGS_SUMMARY}}
{{/TAGS_SUMMARY}}

In one sentence, what is the main research theme or focus of this project?
```

### Example output

```
This project focuses on CRISPR off-target detection and characterization in primary human cells.
```

---

## 3. Recommend next relevant papers (required hook)

**Hook id:** `recommend_next_papers`  
**When:** Required when the user requests “Recommend next papers” for a project.  
**Input:** Project name and context (titles, abstracts, keywords/tags).  
**Output:** Structured list of recommended papers with title, rationale, and optional search hints (query or DOI/identifier).

### System

```
You are a research assistant. Given a project's existing papers (titles, abstracts, and keywords), you recommend 3–5 additional papers that would be highly relevant for the project. For each recommendation you must provide:
1. A suggested paper title or clear search phrase (what to look for).
2. A short rationale (1–2 sentences) for why it fits the project.
3. Optional: a search query (e.g. for Google Scholar, PubMed, or Semantic Scholar) or a specific identifier (DOI/PMID) if you know one.

Base recommendations on the project's theme, methods, and gaps suggested by the existing papers. Do not invent specific papers you are not sure exist; prefer "Search for: [query]" when uncertain. Output only valid JSON matching the schema below, no markdown or extra text.
```

### User

```
Project name: {{PROJECT_NAME}}

Existing papers in this project:
---
{{PROJECT_PAPERS_CONTEXT}}
---

Recommend 3–5 next papers that would strengthen this project. For each item provide: title_or_search_phrase, rationale, and optionally search_query or doi. Output a JSON object with key "recommendations" containing an array of objects with keys: title_or_search_phrase, rationale, search_query (optional), doi (optional).
```

### Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{PROJECT_NAME}}` | Name of the project. |
| `{{PROJECT_PAPERS_CONTEXT}}` | Concatenated context: for each paper, "Title: … Abstract: … Keywords: …" (or titles only if abstracts unavailable). Truncate to stay within model context (e.g. last 10 papers, 200 words per abstract). |

### Output schema (JSON)

```json
{
  "recommendations": [
    {
      "title_or_search_phrase": "string",
      "rationale": "string",
      "search_query": "string (optional)",
      "doi": "string (optional)"
    }
  ]
}
```

### Example output

```json
{
  "recommendations": [
    {
      "title_or_search_phrase": "GUIDE-seq and CIRCLE-seq for genome-wide off-target profiling",
      "rationale": "Your project uses ChIP-seq for validation; these methods are the standard for unbiased off-target discovery and would complement the existing papers.",
      "search_query": "GUIDE-seq CRISPR off-target genome-wide"
    },
    {
      "title_or_search_phrase": "Search for: base editor off-target prediction machine learning",
      "rationale": "Several papers focus on Cas9; adding base-editor and computational prediction work would broaden the project.",
      "search_query": "base editor off-target prediction machine learning"
    }
  ]
}
```

---

## 4. Flow–prompt mapping

| Workflow | Step | LLM hook | Template |
|----------|------|----------|----------|
| Tagging and annotating papers | user_edits_tags (optional) | tag_suggestions | suggest_tags_for_paper |
| Viewing project overview | render_overview (optional) | project_overview_insight | project_overview_insight |
| Recommend next papers | build_recommendation_prompt | recommend_next_papers | recommend_next_papers |

---

## 5. Integration notes

- **Context for recommend_next_papers:** Build `PROJECT_PAPERS_CONTEXT` from the project’s items: fetch collection items (Zotero or local storage), then for each item include title and, if available, abstract (from `item.data.abstractNote`) and tags. Truncate to ~4000 characters total to leave room for the response.
- **Tag suggestions:** Run only when the Edit tags modal opens; pass `paper_title` and optional `abstractNote` from the current item.
- **Project overview insight:** Run after project detail is loaded; pass project name and list of paper titles (and optionally aggregated tags). Can be skipped if the user prefers no LLM call on overview.
- **Parsing:** For tag and recommendation hooks, parse JSON from the model response; strip markdown code fences if present. Validate recommendations against the schema before rendering in the UI.

---

**Files:**  
- Workflows and UI states: `docs/PROJECT_MANAGEMENT_FLOWS.json`  
- Prompt templates: `docs/PROJECT_MANAGEMENT_PROMPTS.md`
