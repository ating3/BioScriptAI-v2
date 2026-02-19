# BioScriptAI — Tailored Paper Summary Prompt (Cursor)

Cursor prompt with metadata for adaptive summarization. Generates structured bullet-point summaries tuned to the user’s goal (methods, literature gap, or results focus).

---

## Cursor prompt metadata (frontmatter)

Use this block at the top when invoking as a Cursor prompt. Variables control focus and output shape.

```yaml
---
name: Paper summary (tailored)
description: Generate a structured bullet-point summary of an academic paper, adjustable by user goal (methods / literature gap / results focus).
version: "1.0"

# Adaptive summarization metadata
summary_goal: "{{SUMMARY_GOAL}}"           # one of: methods_focus | literature_gap_focus | results_focus | balanced
focus_weight: "{{FOCUS_WEIGHT}}"           # optional: low | medium | high (emphasis on chosen goal section)
user_research_context: "{{USER_RESEARCH_CONTEXT}}"  # optional; 1–2 sentences for tailoring
paper_context: "{{PAPER_CONTEXT}}"         # full or excerpted paper text
output_format: structured_bullets          # objective, methodology, results, limitations
max_bullets_per_section: 5
---
```

---

## System instruction (fixed)

```
You are an expert at summarizing academic papers. You produce clear, structured summaries with bullet points. Your summary is tailored to the user's stated goal: they may care most about methods, the literature gap (what's new / what's missing), or results. You will receive a "summary goal" and optional "focus weight"; emphasize that dimension without omitting the others.

Output structure (use these exact section headers and bullet lists):
- **Objective**: bullet points stating the paper's aim and research questions.
- **Methodology**: bullet points on design, data, and methods (experimental or computational).
- **Results**: bullet points on main findings and evidence.
- **Limitations**: bullet points on stated limitations, caveats, or future work.

Rules:
- Use only information present in the provided paper text. Do not invent content.
- Each section must have at least 1 bullet, at most 5 (or the provided max).
- Be concise: one idea per bullet; no long paragraphs.
- When the summary goal is "methods_focus", give extra detail and nuance in Methodology; keep Objective/Results/Limitations shorter.
- When the summary goal is "literature_gap_focus", emphasize what gap the paper fills, what it adds to the literature, and what remains open; still cover all four sections.
- When the summary goal is "results_focus", emphasize quantitative and qualitative results, effect sizes, and comparisons; keep Methods brief.
- When the summary goal is "balanced", give roughly equal weight to all sections.
- If the user provided research context, briefly relate the paper to it in one bullet under the most relevant section (or under Objective).
```

---

## User prompt template

```
Summary goal: {{SUMMARY_GOAL}}
Focus weight: {{FOCUS_WEIGHT}}
{{#USER_RESEARCH_CONTEXT}}
User's research context (tailor summary relevance to this): {{USER_RESEARCH_CONTEXT}}
{{/USER_RESEARCH_CONTEXT}}

Paper to summarize:
---
{{PAPER_CONTEXT}}
---

Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize the dimension indicated by the summary goal. Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.
```

---

## Placeholders reference

| Placeholder | Description | Example values |
|-------------|-------------|----------------|
| `{{SUMMARY_GOAL}}` | User-chosen focus for the summary | `methods_focus`, `literature_gap_focus`, `results_focus`, `balanced` |
| `{{FOCUS_WEIGHT}}` | How strongly to emphasize that goal | `low`, `medium`, `high` |
| `{{USER_RESEARCH_CONTEXT}}` | Optional 1–2 sentences on user's project | "Understanding CRISPR off-targets in vivo" |
| `{{PAPER_CONTEXT}}` | Full paper or excerpt (e.g. abstract + key sections) | Paper text or `{{CURRENT_SECTION_TEXT}}` |

---

## Example user goals and prompt variations

### 1. Methods focus

**User goal:** "I want to understand how they did the experiments and what I could replicate."

**Metadata / variables:**
- `SUMMARY_GOAL`: `methods_focus`
- `FOCUS_WEIGHT`: `high`
- `USER_RESEARCH_CONTEXT`: (optional) "Replicating in vitro validation assays"

**Prompt variation (filled):**
```
Summary goal: methods_focus
Focus weight: high

Paper to summarize:
---
{{PAPER_CONTEXT}}
---

Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize methodology: include enough detail on design, protocols, and data so a reader could assess replicability. Keep Objective and Results concise; Limitations can note method-related caveats. Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.
```

---

### 2. Literature gap focus

**User goal:** "I need to see what's new and what's still missing in the field."

**Metadata / variables:**
- `SUMMARY_GOAL`: `literature_gap_focus`
- `FOCUS_WEIGHT`: `high`
- `USER_RESEARCH_CONTEXT`: (optional) "Surveying state of the art in base editors"

**Prompt variation (filled):**
```
Summary goal: literature_gap_focus
Focus weight: high

Paper to summarize:
---
{{PAPER_CONTEXT}}
---

Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize the literature gap: what problem or gap the paper addresses, what it adds compared to prior work, and what remains open or contested. Include under Limitations any acknowledged gaps or future directions. Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.
```

---

### 3. Results focus

**User goal:** "I care most about the main findings and numbers."

**Metadata / variables:**
- `SUMMARY_GOAL`: `results_focus`
- `FOCUS_WEIGHT`: `high`
- `USER_RESEARCH_CONTEXT`: (optional) empty

**Prompt variation (filled):**
```
Summary goal: results_focus
Focus weight: high

Paper to summarize:
---
{{PAPER_CONTEXT}}
---

Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize results: main findings, key metrics, effect sizes, and comparisons. Keep Methodology brief (one or two bullets). Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.
```

---

### 4. Balanced (default)

**User goal:** "Just give me a standard summary of the paper."

**Metadata / variables:**
- `SUMMARY_GOAL`: `balanced`
- `FOCUS_WEIGHT`: `low`

**Prompt variation:** Use the generic user prompt template above with `SUMMARY_GOAL: balanced` and no extra emphasis instruction.

---

## Structured output format (canonical)

The model should produce markdown in this shape. Parsers can expect these headers and bullet lists.

```markdown
**Objective**
- Bullet 1
- Bullet 2

**Methodology**
- Bullet 1
- Bullet 2

**Results**
- Bullet 1
- Bullet 2

**Limitations**
- Bullet 1
- Bullet 2
```

Optional: request JSON instead for downstream use (same logical structure):

```json
{
  "objective": ["bullet 1", "bullet 2"],
  "methodology": ["bullet 1", "bullet 2"],
  "results": ["bullet 1", "bullet 2"],
  "limitations": ["bullet 1", "bullet 2"]
}
```

---

## JSON schema for structured summary (optional)

For implementations that request or parse JSON output:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TailoredPaperSummary",
  "type": "object",
  "required": ["objective", "methodology", "results", "limitations"],
  "properties": {
    "objective": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5
    },
    "methodology": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5
    },
    "results": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5
    },
    "limitations": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 5
    }
  }
}
```

---

## Cursor usage (adaptive summarization)

1. **In Cursor:** Use the frontmatter as prompt metadata; set `SUMMARY_GOAL` from the user’s choice (e.g. dropdown: Methods / Literature gap / Results / Balanced) and optionally `USER_RESEARCH_CONTEXT` from the workspace or project.
2. **In BioScriptAI extension:** The summarization module can load this template, substitute `{{PAPER_CONTEXT}}` from the current section or full paper, set `{{SUMMARY_GOAL}}` and `{{FOCUS_WEIGHT}}` from the sidebar UI, and send the resulting prompt to the local LLM.
3. **Conditional block:** If your runtime supports conditionals (e.g. Mustache), render the "User's research context" line only when `USER_RESEARCH_CONTEXT` is non-empty.

---

**File:** `docs/SUMMARY_PROMPT_TEMPLATE.md` — Use with the Summarization module and Cursor; supports adaptive summarization via goal and focus weight.
