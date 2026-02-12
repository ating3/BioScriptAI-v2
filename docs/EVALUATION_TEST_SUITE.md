# BioScriptAI v2.0 — Automated Test Suite & Evaluation Metrics

Test prompt templates, expected outputs, and scoring rubrics to validate: summary accuracy, QA context awareness, term definition correctness, figure understanding, Zotero integration success, and UI responsiveness.

---

## 1. Summary Accuracy

### 1.1 Test cases

| ID | Input (paper excerpt) | Summary goal | Expected behavior |
|----|------------------------|--------------|-------------------|
| SUM-01 | 200-word Methods paragraph (explicit protocol: "Cells were treated with X for 24 h; RNA was extracted with Y kit.") | methods_focus | Summary includes: treatment (X, 24 h), extraction (Y kit). No invented steps. |
| SUM-02 | 150-word Results paragraph with numbers ("p < 0.01", "fold change 2.3 ± 0.4") | results_focus | Summary includes key statistics; numbers match or are correctly paraphrased. |
| SUM-03 | Abstract + one Limitations sentence ("Our study is limited to in vitro conditions.") | balanced | Limitations section has at least one bullet reflecting that sentence. |
| SUM-04 | Paragraph with no explicit objective | balanced | Objective section does not invent a specific aim; says "not stated" or paraphrases cautiously. |

### 1.2 Test prompt template (summary)

```
[SYSTEM: Use docs/SUMMARY_PROMPT_TEMPLATE.md system instruction.]

Input paper excerpt:
---
{{PAPER_EXCERPT}}
---

Summary goal: {{SUMMARY_GOAL}}
Produce the four sections (Objective, Methodology, Results, Limitations) as bullet points.
```

**Placeholders:** `PAPER_EXCERPT` (fixed test text), `SUMMARY_GOAL` ∈ {methods_focus, results_focus, balanced}.

### 1.3 Expected output criteria

- All four section headers present.
- Methods-focus: ≥2 method-specific details from excerpt.
- Results-focus: ≥1 key statistic present and correct.
- No hallucinated protocols or numbers not in excerpt.
- Limitations: if excerpt states a limitation, it appears in Limitations.

### 1.4 Scoring rubric (summary accuracy)

| Score | Criteria |
|-------|----------|
| 3 — Pass | All required sections present; key facts from excerpt appear; no clear hallucinations. |
| 2 — Partial | Sections present; minor omission (e.g. one key number) or one mild hallucination. |
| 1 — Fail | Missing section; major omission; invented protocol/result; or copy-paste without summarization. |
| 0 — Invalid | No structured summary or unrelated output. |

**Metric:** Pass rate = (count of 3) / total. Target ≥ 90% for SUM-01–SUM-04.

---

## 2. Context Awareness of QA

### 2.1 Test cases

| ID | Context (fixed excerpt) | Question | Expected behavior |
|----|--------------------------|----------|-------------------|
| QA-01 | "Validation was performed using ChIP-seq in HEK293 cells. Peaks were called with MACS2 (q < 0.05)." | "What method was used to validate?" | Answer mentions ChIP-seq (and optionally HEK293, MACS2). |
| QA-02 | Same as QA-01 | "What was the sample size?" | Answer states that sample size is not in the context / not stated. |
| QA-03 | "The model assumes a constant mutation rate across sites." | "What do they assume about mutation rate?" | Answer states constant mutation rate (no regional variation). |
| QA-04 | Paragraph A (methods); question about results | "What were the main findings?" | Answer defers: e.g. "Not in this section; likely in Results." |

### 2.2 Test prompt template (QA)

```
[SYSTEM: Use docs/QA_PROMPT_TEMPLATE.md system instruction.]

Current paper section:
---
{{CONTEXT_EXCERPT}}
---

Question: {{QUESTION}}
Answer based only on the context above.
```

**Placeholders:** `CONTEXT_EXCERPT`, `QUESTION` from test case.

### 2.3 Expected output criteria

- QA-01: Contains "ChIP-seq" (or equivalent).
- QA-02: Contains "not" (not in context / not stated) and does not invent a number.
- QA-03: Contains "constant" (and optionally "mutation rate").
- QA-04: Indicates that findings are not in the given context.

### 2.4 Scoring rubric (QA context awareness)

| Score | Criteria |
|-------|----------|
| 3 — Pass | Answer is grounded in context; no hallucination; correct deferral when context lacks answer. |
| 2 — Partial | Mostly correct but one minor error (e.g. wrong detail) or slightly vague deferral. |
| 1 — Fail | Invents information (e.g. sample size when not in context) or ignores context. |
| 0 — Invalid | Unrelated or empty. |

**Metric:** Pass rate over QA-01–QA-04. Target ≥ 90%. Optional: deferral rate on QA-02 and QA-04 = 100%.

---

## 3. Term Definition Correctness

### 3.1 Test cases

| ID | Highlighted term | Paper excerpt (context) | Expected behavior |
|----|-------------------|--------------------------|-------------------|
| DEF-01 | "off-target effects" | "CRISPR-Cas9 can cause off-target effects when the guide RNA binds to similar sequences." | Definition relates to unintended cuts/binding; usage example from excerpt. |
| DEF-02 | "q-value" | "Peaks were called with MACS2 (q < 0.05)." | Definition relates to significance (FDR/adjusted p); usage reflects threshold. |
| DEF-03 | "SEM" | "Error bars, SEM; n=3." | Definition: standard error of the mean; usage example from excerpt. |

### 3.2 Test prompt template (term definition)

```
[SYSTEM: Use docs/TERM_DEFINITION_PROMPT.md system instruction.]

Term to define: "{{TERM}}"
Paper excerpt:
---
{{EXCERPT}}
---

Return JSON: term, definition, simplified_explanation, usage_examples, reference_links.
```

### 3.3 Expected output criteria

- `definition` is contextually correct (matches how term is used in excerpt).
- `usage_examples` includes at least one quote or paraphrase from the excerpt.
- No contradictory or invented usage.

### 3.4 Scoring rubric (term definition)

| Score | Criteria |
|-------|----------|
| 3 — Pass | Definition correct and contextual; ≥1 usage example from excerpt; valid JSON. |
| 2 — Partial | Definition mostly correct; usage example present but incomplete or one minor error. |
| 1 — Fail | Definition wrong or generic (not contextual); or no usage example from excerpt. |
| 0 — Invalid | Invalid JSON or unrelated output. |

**Metric:** Pass rate over DEF-01–DEF-03. Target ≥ 85%.

---

## 4. Figure Understanding Quality

### 4.1 Test cases

| ID | Input | Expected behavior |
|----|--------|-------------------|
| FIG-01 | Image: line plot; OCR: "X: Time (h), Y: Fold change"; caption: "Gene X expression over time." | Structured extraction has axes (Time, Fold change); explanation mentions time course / expression. |
| FIG-02 | Image: bar chart; OCR: "Condition A 2.1, B 0.8"; caption: "Comparison of conditions." | Key values (2.1, 0.8 or equivalent) in extraction or explanation. |
| FIG-03 | Table image; OCR: "Gene, log2FC, p-value" + 3 rows | Headers and at least one correct numeric value in extraction. |

### 4.2 Test prompt template (figure)

```
[SYSTEM: Use docs/FIGURE_TABLE_PROMPT_TEMPLATE.md system instruction.]

[IMAGE: {{FIGURE_IMAGE_PATH_OR_BASE64}}]
CAPTION: {{CAPTION}}
OCR: {{OCR_TEXT}}
USER REQUEST: extract_and_explain

Return structured extraction (JSON) and Explanation + Insights tied to text.
```

### 4.3 Expected output criteria

- Axes/headers and units present in extraction (FIG-01, FIG-02).
- At least one key value or trend correct (FIG-01, FIG-02, FIG-03).
- Explanation is coherent and references the image/caption.

### 4.4 Scoring rubric (figure understanding)

| Score | Criteria |
|-------|----------|
| 3 — Pass | Correct axes/headers; ≥1 key value/trend correct; coherent explanation. |
| 2 — Partial | Structure mostly correct; minor value error or vague explanation. |
| 1 — Fail | Wrong axes/values or no meaningful explanation. |
| 0 — Invalid | No extraction or unrelated output. |

**Metric:** Pass rate over FIG-01–FIG-03. Target ≥ 80% (figure tasks are harder).

---

## 5. Zotero Integration Success Rates

### 5.1 Test cases (API / integration)

| ID | Action | Precondition | Expected result | Success criterion |
|----|--------|--------------|-----------------|-------------------|
| ZOT-01 | Validate API key | Valid key in config | 200; userID in response | HTTP 200; userID present. |
| ZOT-02 | Validate API key | Invalid key | 403 | HTTP 403. |
| ZOT-03 | Create collection | Valid key; unique name | 200; collection key in response | HTTP 200; key in successful. |
| ZOT-04 | Create item (journalArticle) | Valid key; title, creators, DOI | 200; item key in response | HTTP 200; item key returned. |
| ZOT-05 | Add item to collection | Item key; collection key | 204 or 200 (PATCH) | Item appears in collection (GET collection items). |
| ZOT-06 | Export collection (BibTeX) | Collection with ≥1 item | 200; valid BibTeX string | HTTP 200; output contains @article or @book. |
| ZOT-07 | Export collection (APA) | Collection with ≥1 item | 200; XHTML/bib body | HTTP 200; formatted references present. |

### 5.2 Expected outputs (examples)

- **ZOT-01:** `{ "userID": 12345, "access": { "user": { "write": true } } }`.
- **ZOT-03:** `{ "successful": { "0": "<collectionKey>" } }`.
- **ZOT-04:** `{ "success": { "0": "<itemKey>" } }`.
- **ZOT-06:** String starting with `@` and containing `title`, `author`-like fields.

### 5.3 Scoring rubric (Zotero)

| Score | Criteria |
|-------|----------|
| 1 — Pass | HTTP success and response matches expected (key present, valid export format). |
| 0 — Fail | HTTP error, wrong status, or response missing required data. |

**Metric:** Success rate = passes / total (ZOT-01–ZOT-07). Target 100% for valid keys and data; ZOT-02 must return 403.

---

## 6. UI Responsiveness

### 6.1 Test cases (manual or E2E)

| ID | Scenario | Measurement | Target |
|----|----------|-------------|--------|
| UI-01 | Open sidebar (hotkey or icon) | Time from trigger to sidebar visible | < 500 ms (p95). |
| UI-02 | Load project list (after Zotero connected) | Time from click to list rendered | < 2 s (p95). |
| UI-03 | Submit QA question (local LLM) | Time from Send to first token or full response | < 10 s first token; configurable for full response. |
| UI-04 | Scroll on PDF; capture visible context | Time from scroll stop to buffer updated (throttled) | < 400 ms (p95) after throttle. |
| UI-05 | Switch workspace tab (Papers ↔ Projects) | Time to switch and show content | < 300 ms. |

### 6.2 Test prompt / procedure (UI)

- **UI-01:** Trigger sidebar open N times; record `t_render - t_trigger`; compute p95.
- **UI-02:** Click "Projects" (or refresh); record time until first project row visible.
- **UI-03:** Send fixed question; record time to first token and time to last token.
- **UI-04:** Scroll; record time from scroll end (after 300 ms throttle) to buffer-update callback.
- **UI-05:** Click tab; record time until target panel is visible.

### 6.3 Scoring rubric (UI responsiveness)

| Score | Criteria |
|-------|----------|
| 3 — Pass | Metric within target (e.g. p95 < threshold). |
| 2 — Partial | Within 1.5× target. |
| 1 — Fail | > 1.5× target or timeout/error. |
| 0 — N/A | Test not run or not applicable. |

**Metric:** Pass rate over UI-01–UI-05 (excluding N/A). Target ≥ 80% pass.

---

## 7. Aggregate Metrics & Reporting

| Category | Primary metric | Target |
|----------|----------------|--------|
| Summary accuracy | Pass rate (score 3) on SUM-01–SUM-04 | ≥ 90% |
| QA context awareness | Pass rate on QA-01–QA-04; deferral on QA-02, QA-04 | ≥ 90%; 100% deferral |
| Term definition | Pass rate on DEF-01–DEF-03 | ≥ 85% |
| Figure understanding | Pass rate on FIG-01–FIG-03 | ≥ 80% |
| Zotero integration | Success rate on ZOT-01–ZOT-07 | 100% (valid key); 403 for invalid |
| UI responsiveness | Pass rate on UI-01–UI-05 | ≥ 80% |

**Overall suite:** Optional rollup e.g. (SUM_pass + QA_pass + DEF_pass + FIG_pass + ZOT_pass + UI_pass) / 6; target ≥ 85%.

---

## 8. Test Data and Artifacts

- **Paper excerpts:** Store in `tests/fixtures/summary/`, `tests/fixtures/qa/`, `tests/fixtures/term_def/` as plain text or JSON (excerpt + question + expected key phrases).
- **Figures:** Store test images + OCR + caption in `tests/fixtures/figures/` (FIG-01–FIG-03).
- **Zotero:** Use a dedicated test Zotero account and API key; create/delete test collections and items in setup/teardown.
- **Expected outputs:** Optional golden files (e.g. `tests/expected/summary/SUM-01.json`) for regression; compare key fields or embeddings instead of exact string match.

---

**File:** `docs/EVALUATION_TEST_SUITE.md` — Use for automated and manual validation; implement test runners that use these prompts, criteria, and rubrics.
