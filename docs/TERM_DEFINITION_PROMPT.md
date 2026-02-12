# BioScriptAI — Term Definition Prompt

Prompt template for the term highlighter / definition tooltip. The LLM receives the user’s highlighted term and surrounding paper context, then returns a **contextually relevant** definition, simplified explanation, in-paper usage examples, and optional reference links. Output is structured JSON.

---

## 1. System Instruction

```
You are an academic terminology assistant. Given a term that the user has highlighted in a paper, you will:

1. Define the term in a way that is relevant to how it is used in this paper (contextual definition).
2. Provide a simplified, plain-language explanation suitable for quick reading.
3. Extract 1–3 short usage examples from the provided paper excerpt (direct quotes or close paraphrases).
4. Suggest 0–3 further reference links (e.g. Wikipedia, standard textbook, or key paper) when helpful. Use stable URLs only.

Respond only with valid JSON. No markdown code fences, no extra text before or after the JSON. Use the exact keys: term, definition, simplified_explanation, usage_examples, reference_links.
```

---

## 2. User Prompt Template

Use these placeholders; replace at runtime.

- `{{HIGHLIGHTED_TERM}}` — The exact text the user highlighted.
- `{{PAPER_EXCERPT}}` — Surrounding paragraph(s) or section where the term appears (enough for context and usage examples).
- `{{OPTIONAL_DOMAIN}}` — e.g. "computational biology", "machine learning", to bias definitions.

```
Term to define: "{{HIGHLIGHTED_TERM}}"

Paper excerpt (use this for context and usage examples):
---
{{PAPER_EXCERPT}}
---

Domain (optional): {{OPTIONAL_DOMAIN}}

Return valid JSON with these keys only:
- term (string): the term being defined, as used in the paper
- definition (string): precise, contextually relevant definition for this paper
- simplified_explanation (string): 1–2 sentences in plain language
- usage_examples (array of strings): 1–3 short quotes or paraphrases from the excerpt above
- reference_links (array of objects with "title" and "url"): 0–3 further reading links
```

---

## 3. Full Prompt (Copy-Paste)

**System:**

```
You are an academic terminology assistant. Given a term that the user has highlighted in a paper, you will:

1. Define the term in a way that is relevant to how it is used in this paper (contextual definition).
2. Provide a simplified, plain-language explanation suitable for quick reading.
3. Extract 1–3 short usage examples from the provided paper excerpt (direct quotes or close paraphrases).
4. Suggest 0–3 further reference links (e.g. Wikipedia, standard resource, or key paper) when helpful. Use stable URLs only.

Respond only with valid JSON. No markdown code fences, no extra text before or after the JSON. Use the exact keys: term, definition, simplified_explanation, usage_examples, reference_links.
```

**User:**

```
Term to define: "{{HIGHLIGHTED_TERM}}"

Paper excerpt (use this for context and usage examples):
---
{{PAPER_EXCERPT}}
---

Domain (optional): {{OPTIONAL_DOMAIN}}

Return valid JSON with these keys only:
- term (string): the term being defined, as used in the paper
- definition (string): precise, contextually relevant definition for this paper
- simplified_explanation (string): 1–2 sentences in plain language
- usage_examples (array of strings): 1–3 short quotes or paraphrases from the excerpt above
- reference_links (array of objects with "title" and "url"): 0–3 further reading links
```

---

## 4. Output JSON Schema

Response must be parseable as this structure:

```json
{
  "term": "string",
  "definition": "string",
  "simplified_explanation": "string",
  "usage_examples": ["string"],
  "reference_links": [
    { "title": "string", "url": "string" }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `term` | string | The term as written in the paper (normalized if needed, e.g. acronym expanded once). |
| `definition` | string | Contextually relevant definition (how the paper uses it). |
| `simplified_explanation` | string | 1–2 sentences in plain language for quick understanding. |
| `usage_examples` | string[] | 1–3 short quotes or paraphrases from the provided excerpt. |
| `reference_links` | { title, url }[] | 0–3 items; stable URLs only (Wikipedia, textbooks, key papers). |

---

## 5. Example Input → Output

**Input (placeholders filled):**

- Highlighted term: `off-target effects`
- Excerpt: "CRISPR-Cas9 can cause off-target effects when the guide RNA binds to similar sequences. We used GUIDE-seq to map off-target sites in primary cells. Off-target effects remain a limitation for therapeutic applications."

**Expected output (JSON only):**

```json
{
  "term": "off-target effects",
  "definition": "In CRISPR editing, unintended cuts or edits at genomic sites that are similar but not identical to the intended target, often due to guide RNA binding to partially matched sequences.",
  "simplified_explanation": "The enzyme sometimes cuts the DNA in the wrong place when the target sequence looks similar elsewhere. That can cause unwanted changes and is a key safety concern.",
  "usage_examples": [
    "CRISPR-Cas9 can cause off-target effects when the guide RNA binds to similar sequences.",
    "We used GUIDE-seq to map off-target sites in primary cells.",
    "Off-target effects remain a limitation for therapeutic applications."
  ],
  "reference_links": [
    { "title": "Off-target (Wikipedia)", "url": "https://en.wikipedia.org/wiki/CRISPR_gene_editing#Off-target_effects" },
    { "title": "GUIDE-seq method", "url": "https://doi.org/10.1038/nbt.3117" }
  ]
}
```

---

## 6. Implementation Notes

- **Detect highlighted text:** From the term highlighter (double-click or selection); send the exact selected string as `{{HIGHLIGHTED_TERM}}`.
- **Build excerpt:** Use the scroll-aware context buffer or the current section so `{{PAPER_EXCERPT}}` includes the paragraph(s) where the term appears (e.g. 500–1500 chars).
- **Optional domain:** Set from active project or paper metadata (e.g. “genomics”, “cancer biology”) to improve relevance.
- **Parsing:** Parse LLM response as JSON; if the model returns markdown-wrapped JSON, strip ```json ... ``` before parsing.
- **Tooltip UI:** Map `definition` and `simplified_explanation` to the tooltip body; show `usage_examples` as a short list; render `reference_links` as clickable links (open in new tab).

---

## 7. JSON Schema (Strict)

For validation and type-checking:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TermDefinitionResponse",
  "type": "object",
  "required": ["term", "definition", "simplified_explanation", "usage_examples", "reference_links"],
  "properties": {
    "term": { "type": "string", "minLength": 1 },
    "definition": { "type": "string", "minLength": 1 },
    "simplified_explanation": { "type": "string", "minLength": 1 },
    "usage_examples": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 3
    },
    "reference_links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "url"],
        "properties": {
          "title": { "type": "string" },
          "url": { "type": "string", "format": "uri" }
        }
      },
      "maxItems": 3
    }
  }
}
```

---

**File:** `docs/TERM_DEFINITION_PROMPT.md` — Use with the term highlighter and definition tooltip; response shape matches `SIDEBAR_UI_SPEC.json` (DefinitionTooltip) and provides the four requested fields in JSON: term, definition, usage_examples, reference_links (plus simplified_explanation for UX).
