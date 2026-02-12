# BioScriptAI — Multimodal Figure & Table Interpretation Prompt

Structured prompt pattern for a multimodal LLM that interprets figures and tables: accepts image + OCR + caption, extracts axes/units/key values, produces a natural-language explanation, answers figure-specific questions, and ties insights to the surrounding paper text.

---

## 1. Design Overview

| Input | Role |
|-------|------|
| **Figure/table image** | Primary visual (attached as image to the multimodal API). |
| **OCR text** | Text extracted from the image (axis labels, legends, cell text) to disambiguate and ground extraction. |
| **Caption** | Surrounding caption from the paper (figure title and caption paragraph). |
| **Optional: surrounding text** | 1–2 paragraphs from the paper that reference this figure (for “insights tied to text”). |

| Output | Role |
|--------|------|
| **Structured extraction** | Axes, units, key values (and for tables: row/column headers, notable cells). |
| **Natural-language explanation** | Short summary of what the figure/table shows and why it matters. |
| **Figure-specific Q&A** | Answers to user questions about this figure. |
| **Text-linked insights** | Bullet points that connect figure content to claims or methods in the paper. |

---

## 2. System Instruction

```
You are an expert at interpreting scientific figures and tables. You receive:
1. An image of a figure or table.
2. OCR text extracted from that image (axis labels, legends, table cells, etc.).
3. The figure/table caption from the paper.
4. Optionally, surrounding paragraph(s) from the paper that refer to this figure.

Your tasks:
- Extract structure: for figures, identify axes (names and units), legend entries, and key data points or trends; for tables, identify headers and notable values (e.g. p-values, effect sizes).
- Produce a short natural-language explanation of what the figure/table shows and its role in the paper.
- Answer any follow-up question the user asks about this figure/table, using only the image, OCR, caption, and provided text.
- When possible, tie insights to the paper text (e.g. "The text states that X; this figure shows Y which supports that.").

Rules:
- Base all extraction and explanation on the image and provided OCR/caption/text. Do not invent data.
- If OCR is missing or unclear for a label, say "not clearly visible" rather than guessing.
- Use the exact axis names, units, and values from the image/OCR when citing them.
- Keep explanations concise; use bullet points for structure when helpful.
```

---

## 3. Input Structure (Structured Prompt)

Present the following blocks in order. The **image** is attached as a separate message part (e.g. image URL or base64) in your multimodal API; the rest are text.

```
[IMAGE: figure or table]

---
CAPTION (from paper):
{{FIGURE_CAPTION}}

---
OCR (text extracted from the image):
{{OCR_TEXT}}

---
SURROUNDING TEXT (paragraphs that reference this figure; optional):
{{SURROUNDING_TEXT}}

---
USER REQUEST:
{{USER_REQUEST}}
```

**Placeholders:**

| Placeholder | Description | When to omit |
|-------------|-------------|--------------|
| `{{FIGURE_CAPTION}}` | Full figure/table caption (title + caption paragraph). | Never. |
| `{{OCR_TEXT}}` | Raw or lightly cleaned OCR from the image (axis labels, legends, table content). | Omit only if OCR failed; then say "OCR unavailable." |
| `{{SURROUNDING_TEXT}}` | 1–2 paragraphs from the paper that mention this figure (e.g. "Figure 2 shows…"). | Omit if not available. |
| `{{USER_REQUEST}}` | One of: "extract_and_explain" | "explain_only" | or a specific question, e.g. "What is the trend in condition B?" | Set by UI. |

---

## 4. Output Structure

The model should respond in two parts: (1) **structured extraction** (so parsers can use it), and (2) **natural-language explanation and insights**. Use the following format.

### 4.1 Structured extraction (request as JSON or markdown block)

For **figures:**

```json
{
  "type": "figure",
  "axes": [
    { "name": "x_axis", "label": "Time (hours)", "unit": "h" },
    { "name": "y_axis", "label": "Expression level", "unit": "fold change" }
  ],
  "legend_entries": ["Condition A", "Condition B", "Control"],
  "key_values_or_trends": [
    "Peak at 24 h in Condition A (~3.2-fold)",
    "Condition B plateaus after 12 h"
  ],
  "data_type": "line plot"
}
```

For **tables:**

```json
{
  "type": "table",
  "headers": { "rows": ["Gene", "log2FC", "p-value"], "columns": ["Sample 1", "Sample 2", "Sample 3"] },
  "notable_cells": [
    { "row": "Gene X", "column": "Sample 2", "value": "4.2", "note": "largest log2FC" }
  ],
  "key_values": ["p < 0.01 for Gene X and Y"]
}
```

### 4.2 Natural-language block

After the structured block, the model should output:

1. **Explanation:** 2–4 sentences describing what the figure/table shows and why it matters in the paper.
2. **Insights tied to text:** 1–3 bullet points that connect the figure/table to claims or methods in the surrounding text (e.g. "The Methods state that…; this figure shows…").
3. **Answer to user question (if any):** If `USER_REQUEST` was a specific question, a direct answer in 1–3 sentences.

---

## 5. Prompt Templates by User Request Type

### A. Extract and explain (default)

**User request:** `extract_and_explain`

**Instruction appended to prompt:**
```
First output a JSON block with keys: type, axes (or headers/notable_cells for tables), legend_entries (if figure), key_values_or_trends. Then write a short natural-language explanation and 1–3 bullet points tying the figure/table to the paper text. Use the exact section headers: **Structured extraction**, **Explanation**, **Insights tied to text**.
```

### B. Explain only (no extraction)

**User request:** `explain_only`

**Instruction appended:**
```
Write a short natural-language explanation of what the figure/table shows and how it supports the paper. Include 1–3 bullet points that tie the figure to the surrounding text. Do not output JSON.
```

### C. Figure-specific question

**User request:** (free text, e.g. "What is the difference between Condition A and B at 24 h?")

**Instruction appended:**
```
Answer the user's question about this figure using the image, OCR, and caption. If the surrounding text is relevant, cite it. Then briefly summarize what the figure shows (1–2 sentences) and add 1–2 insights tied to the text. Use sections: **Answer**, **Summary**, **Insights tied to text**.
```

---

## 6. Example Input

**Caption:**
```
Figure 2. Expression of Gene X under stress. (A) Time course of mRNA levels (qPCR, fold change vs. t=0). (B) Protein levels at 24 h (western blot, normalized to actin). Error bars, SEM; n=3.
```

**OCR (simplified):**
```
X axis: Time (h)  0  6  12  24  48
Y axis: Fold change  0  1  2  3  4
Legend: Control — Gene X siRNA — Gene X OE
Table: 24 h  Control 1.0  siRNA 0.3  OE 2.8
```

**Surrounding text:**
```
We next asked whether Gene X was required for the stress response. Knockdown of Gene X (siRNA) reduced expression at 24 h, while overexpression (OE) increased it (Figure 2). These data support a role for Gene X in the observed phenotype.
```

**User request:** `extract_and_explain`

---

## 7. Example Result (Structured Output)

**Structured extraction:**
```json
{
  "type": "figure",
  "axes": [
    { "name": "x_axis", "label": "Time", "unit": "h" },
    { "name": "y_axis", "label": "Fold change", "unit": "fold change vs. t=0" }
  ],
  "legend_entries": ["Control", "Gene X siRNA", "Gene X OE"],
  "key_values_or_trends": [
    "Gene X OE peaks around 24 h at ~2.8-fold",
    "Gene X siRNA ~0.3-fold at 24 h",
    "Control ~1.0 at 24 h"
  ],
  "data_type": "line plot / time course"
}
```

**Explanation:**  
Figure 2 shows the time course of Gene X expression under stress (qPCR, fold change). Panel A shows mRNA over time; panel B shows protein at 24 h. Overexpression (OE) increases expression (peak ~2.8-fold at 24 h), while siRNA knockdown reduces it (~0.3-fold), consistent with Gene X being required for the stress response.

**Insights tied to text:**  
- The text states that knockdown of Gene X reduced expression at 24 h and overexpression increased it; the figure shows the corresponding time course and 24 h values (siRNA 0.3, OE 2.8).  
- The paper interprets these data as supporting a role for Gene X in the observed phenotype; the figure provides the quantitative support (fold changes and n=3, SEM).

---

## 8. Example: Figure-Specific Question

**User request:** "What is the difference between siRNA and OE at 24 h?"

**Answer:**  
At 24 h, Gene X siRNA is about 0.3-fold (reduced) and Gene X OE is about 2.8-fold (increased), so the difference is roughly 2.5-fold between knockdown and overexpression. The caption and text state that this supports Gene X being required for the stress response.

**Summary:**  
The figure shows mRNA and protein levels of Gene X over time; at 24 h the contrast between siRNA and OE is largest.

**Insights tied to text:**  
- The paper uses this 24 h contrast to argue that Gene X is required for the phenotype; the figure provides the quantitative comparison (0.3 vs 2.8-fold).

---

## 9. Example: Table Interpretation

**Caption:**  
Table 1. Top five hits from the screen. log2FC, log2 fold change; FDR, false discovery rate.

**OCR (simulated):**
```
Gene    log2FC   FDR
A       2.1      0.001
B       1.8      0.01
C       1.5      0.02
```

**User request:** `extract_and_explain`

**Structured extraction:**
```json
{
  "type": "table",
  "headers": { "rows": ["Gene", "log2FC", "FDR"], "columns": [] },
  "notable_cells": [
    { "row": "A", "column": "log2FC", "value": "2.1", "note": "largest fold change" },
    { "row": "A", "column": "FDR", "value": "0.001", "note": "most significant" }
  ],
  "key_values": ["Gene A has highest log2FC (2.1) and lowest FDR (0.001)"]
}
```

**Explanation:**  
Table 1 lists the top screen hits with log2 fold change and FDR. Gene A has the largest log2FC (2.1) and smallest FDR (0.001), making it the top candidate.

**Insights tied to text:**  
- (Include when surrounding text is provided: e.g. "The Results state that Gene A was chosen for validation; the table justifies this with the highest log2FC and significance.")

---

## 10. Implementation Checklist

- **Image:** Attach the figure/table image as the image part of a multimodal message (e.g. base64 or URL).  
- **OCR:** Run OCR (e.g. Tesseract or browser/extension API) on the same image; paste result into `{{OCR_TEXT}}`.  
- **Caption:** From the paper DOM or PDF (e.g. "Figure N. …" / "Table N. …"); pass as `{{FIGURE_CAPTION}}`.  
- **Surrounding text:** From the scroll-aware buffer or section containing "Figure N" / "Table N"; pass as `{{SURROUNDING_TEXT}}`.  
- **Parsing:** If the model returns a JSON block, parse it with a strict schema; fall back to markdown sections if the model uses **Structured extraction** / **Explanation** / **Insights tied to text**.  
- **Figure-specific Q&A:** Set `{{USER_REQUEST}}` to the user’s question when they ask about the figure; use template C (Section 5).

---

## 11. JSON Schema for Structured Extraction

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FigureTableExtraction",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "type": { "const": "figure" },
        "axes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "label": { "type": "string" },
              "unit": { "type": "string" }
            }
          }
        },
        "legend_entries": { "type": "array", "items": { "type": "string" } },
        "key_values_or_trends": { "type": "array", "items": { "type": "string" } },
        "data_type": { "type": "string" }
      }
    },
    {
      "type": "object",
      "properties": {
        "type": { "const": "table" },
        "headers": {
          "type": "object",
          "properties": {
            "rows": { "type": "array", "items": { "type": "string" } },
            "columns": { "type": "array", "items": { "type": "string" } }
          }
        },
        "notable_cells": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "row": { "type": "string" },
              "column": { "type": "string" },
              "value": { "type": "string" },
              "note": { "type": "string" }
            }
          }
        },
        "key_values": { "type": "array", "items": { "type": "string" } }
      }
    }
  ]
}
```

---

**File:** `docs/FIGURE_TABLE_PROMPT_TEMPLATE.md` — Use with the Figure Interpretation options in the sidebar and the multimodal LLM; supports extract-and-explain, explain-only, and figure-specific Q&A with text-linked insights.
