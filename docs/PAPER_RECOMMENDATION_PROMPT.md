# BioScriptAI — Personalized Paper Recommendation Prompt Pattern

Cursor prompt and scoring heuristics for an agent that analyzes project context, uses embeddings for semantic relatedness, prioritizes by citation score / recency / project relevance, and outputs recommendations with short justification.

---

## 1. Cursor Prompt (Copy-Paste)

Use this block as a Cursor prompt to implement or refine the recommendation pipeline.

```yaml
---
name: Personalized paper recommendation agent
description: |
  Implement a recommendation pipeline that (1) analyzes the user's project context,
  (2) uses embeddings to find semantically related papers, (3) scores candidates by
  citation score, recency, and project relevance, and (4) outputs top recommendations
  with short justification from the LLM.
version: "1.0"
inputs:
  - project_context (object): { name, papers: [{ title, abstract?, keywords?, year? }] }
  - candidate_pool (array): papers from external API (e.g. Semantic Scholar, PubMed) with title, abstract, year, citation_count, url/doi
  - top_k (number): number of recommendations to return (default 5)
outputs:
  - recommendations (array): [{ title, authors?, year?, url?, citation_count?, score_breakdown?, justification }]
---

# Personalized Paper Recommendation Agent

## Pipeline steps

1. **Project context**
   - Input: project name + list of papers (title, abstract, keywords).
   - Build a single project embedding: concatenate titles + abstracts (truncate per paper, e.g. 200 words), then embed. Alternatively: embed each project paper and use mean (or max-pool) vector as project vector.

2. **Candidate pool**
   - Candidates come from an external API (Semantic Scholar, PubMed, etc.) using search queries derived from project (e.g. keywords, or LLM-generated queries). Each candidate has: title, abstract, year, citation_count, url/doi.

3. **Embeddings**
   - Embed each candidate's title+abstract with the same model used for the project vector.
   - Compute similarity: cosine similarity between project vector and each candidate vector. Normalize to [0, 1] if needed (e.g. (cos + 1) / 2).

4. **Scoring**
   - Use the scoring heuristics below. Combine:
     - semantic_score (from embedding similarity),
     - citation_score (normalized citation count),
     - recency_score (year-based),
     - project_relevance_score (keyword/tag overlap or LLM relevance).
   - Final score = weighted sum. Default weights: semantic 0.4, citation 0.25, recency 0.15, project_relevance 0.2.

5. **Ranking and output**
   - Sort candidates by final score descending. Take top_k.
   - For each top-k item, call the LLM with the "Justification prompt" below to generate a short justification (1–2 sentences) tying the paper to the project.
   - Output JSON: array of { title, authors?, year?, url?, citation_count?, score_breakdown?, justification }.

## Scoring heuristics (see Section 2)

- semantic_score: from embedding cosine similarity, scaled to [0, 1].
- citation_score: log-scale or percentile over pool.
- recency_score: linear or decay by (current_year - year).
- project_relevance_score: Jaccard/keyword overlap or binary "contains project keywords".

## LLM usage

- Use the LLM only for justification of the top-k items (and optionally for generating search queries from project context). Do not use the LLM to rank papers; ranking is done by the scoring formula.
- Justification prompt: given project summary + candidate title/abstract, output 1–2 sentences on why this paper fits the project.
```

---

## 2. Scoring Heuristics

### 2.1 Semantic score (embedding similarity)

- **Input:** Project embedding `v_proj`, candidate embedding `v_cand` (same dimension).
- **Compute:** `cos_sim = (v_proj · v_cand) / (||v_proj|| ||v_cand||)`.
- **Scale to [0, 1]:** `semantic_score = (cos_sim + 1) / 2` (cosine is in [-1, 1]).

**Heuristic:** Higher similarity = more semantically related. Use a single embedding model (e.g. sentence-transformers, OpenAI text-embedding, or Semantic Scholar embedding) for both project and candidates.

---

### 2.2 Citation score

- **Input:** `citation_count` for each candidate (from API). Let `C_max` = max citation count in the candidate pool, `C_min` = min (or 0).
- **Option A — Linear in [0,1]:**  
  `citation_score = (citation_count - C_min) / (C_max - C_min + ε)`  
  (ε to avoid division by zero.)
- **Option B — Log-scale (prefer for long tail):**  
  `citation_score = log(1 + citation_count) / log(1 + C_max)`.
- **Option C — Percentile rank:**  
  `citation_score = percentile_rank(citation_count)` in the pool, then scale to [0, 1].

**Heuristic:** Favors influential papers while not over-penalizing newer work if using log or percentile.

---

### 2.3 Recency score

- **Input:** `year` of publication; `current_year` (e.g. 2025).
- **Option A — Linear decay:**  
  `recency_score = (year - year_min) / (current_year - year_min)`  
  where `year_min` = min year in pool. Newer ⇒ higher.
- **Option B — Exponential decay:**  
  `recency_score = exp(-λ * (current_year - year))`  
  with λ ≈ 0.2 (tune as needed). Recent papers score near 1.
- **Option C — Recency band:**  
  If `current_year - year <= 3` → 1.0; else if <= 7 → 0.6; else 0.3.

**Heuristic:** Balances classic vs recent; choose based on user preference (e.g. “prioritize recent” → larger weight on recency).

---

### 2.4 Project relevance score (keyword / theme overlap)

- **Input:** Project keywords/tags (from project papers) or a short project summary; candidate title + abstract.
- **Option A — Jaccard on keywords:**  
  Extract keywords from project (aggregate from papers) and from candidate title+abstract (e.g. simple tokenization + stopword removal, or keyphrase extraction).  
  `project_relevance_score = |K_proj ∩ K_cand| / |K_proj ∪ K_cand|`.
- **Option B — Binary overlap:**  
  `project_relevance_score = 1` if candidate contains at least one project keyword (or keyphrase), else 0. Can soften: fraction of project keywords found in candidate.
- **Option C — Embedding-based:**  
  Already captured in semantic_score; set project_relevance = 0 or use for a second signal (e.g. “project summary” embedding vs “candidate” embedding if different from main semantic embedding).

**Heuristic:** Direct keyword overlap helps when project has clear terms (e.g. “GUIDE-seq”, “base editor”); combine with semantic for robustness.

---

### 2.5 Combined score

- **Formula:**  
  `final_score = w_sem * semantic_score + w_cit * citation_score + w_rec * recency_score + w_proj * project_relevance_score`  
  with `w_sem + w_cit + w_rec + w_proj = 1`.
- **Default weights:**  
  `w_sem = 0.40`, `w_cit = 0.25`, `w_rec = 0.15`, `w_proj = 0.20`.
- **Optional:** Apply a **diversity** step after ranking: if two top candidates are very similar (embedding similarity > 0.9), demote the lower-ranked one and pull the next candidate up. Repeat until top_k is filled.

---

## 3. Justification Prompt (LLM)

Use after ranking to generate a short justification for each top-k recommendation.

### System

```
You write a short justification (1–2 sentences) for why a recommended paper is relevant to a research project. Base your answer only on the project summary and the paper's title and abstract. Be specific and concise. Output only the justification text, no prefix or label.
```

### User

```
Project: {{PROJECT_NAME}}

Project summary (from existing papers): {{PROJECT_SUMMARY}}

Recommended paper:
Title: {{CANDIDATE_TITLE}}
Abstract: {{CANDIDATE_ABSTRACT}}

In 1–2 sentences, why is this paper relevant to this project?
```

### Output

Plain text (1–2 sentences). The pipeline attaches this as the `justification` field for each recommendation.

---

## 4. Output Schema (Recommendations with Justification)

```json
{
  "recommendations": [
    {
      "title": "string",
      "authors": ["string"],
      "year": "number",
      "url": "string",
      "doi": "string",
      "citation_count": "number",
      "score_breakdown": {
        "semantic": "number",
        "citation": "number",
        "recency": "number",
        "project_relevance": "number",
        "final": "number"
      },
      "justification": "string"
    }
  ]
}
```

`score_breakdown` is optional (useful for debugging and UI tooltips). `justification` is required and comes from the LLM.

---

## 5. Pipeline Summary (Pseudocode)

```
1. project_vector = embed(concat(project_papers titles + abstracts))
2. candidates = fetch_candidates(project_keywords_or_llm_queries)  # from Semantic Scholar / PubMed / etc.
3. For each c in candidates:
     c.embedding = embed(c.title + c.abstract)
     c.semantic_score = (cos_sim(project_vector, c.embedding) + 1) / 2
     c.citation_score = log(1 + c.citation_count) / log(1 + max_citations)
     c.recency_score = exp(-0.2 * (current_year - c.year))
     c.project_relevance_score = jaccard(project_keywords, c.title + c.abstract)
     c.final_score = 0.4*c.semantic + 0.25*c.citation + 0.15*c.recency + 0.2*c.project_relevance
4. top_k = sort(candidates, by=final_score, desc)[:k]
5. Optionally: diversity filter on top_k (embedding similarity threshold).
6. For each r in top_k:
     r.justification = llm_justify(project_summary, r.title, r.abstract)
7. Return { recommendations: top_k with justification }
```

---

## 6. Cursor Prompt (Minimal — Scoring Only)

If you only want to implement or tune the scoring logic:

```yaml
---
name: Paper recommendation scoring heuristics
description: |
  Score candidate papers using: (1) semantic similarity (embedding cosine),
  (2) citation score (log-scale or percentile), (3) recency (year-based decay),
  (4) project relevance (keyword overlap). Combine with configurable weights.
  Default: semantic 0.4, citation 0.25, recency 0.15, project_relevance 0.2.
---
Implement the combined scoring formula and normalization rules from
docs/PAPER_RECOMMENDATION_PROMPT.md Section 2. Expose weights as config.
Return a sorted list of candidates with final_score and optional score_breakdown.
```

---

**File:** `docs/PAPER_RECOMMENDATION_PROMPT.md` — Use with the “Recommend next papers” flow; pipeline uses embeddings + scoring heuristics for ranking and LLM only for justification.
