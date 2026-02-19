/**
 * Prompt Template Loader
 * Loads prompt templates from docs/ and fills placeholders
 */

export class PromptLoader {
  /**
   * Load QA prompt template
   * @param {Object} params - { question, context, researchFocus?, conversationHistory? }
   * @returns {Object} { system, user } prompts
   */
  static loadQAPrompt(params) {
    const system = `You are an expert academic research assistant. Your role is to answer questions about the paper the user is reading, using only the provided context (current section and any prior excerpts). You do not invent or assume information that is not present in the context.

Guidelines:
- Base every answer on the loaded paper section and, when relevant, on the conversation history and the user's stated research focus.
- If the question cannot be answered from the context, say so clearly and suggest what part of the paper might contain the answer (e.g., "This is likely in the Methods section.").
- For domain-specific questions (methods, results, assumptions, limitations), structure your answer briefly: state the finding, then cite the relevant part of the text (e.g., "The authors state that … [see excerpt].").
- Be concise but precise. Use academic tone without unnecessary hedging when the text supports a clear claim.
- When the user's research focus is provided, tailor answers to how the paper relates to that focus (e.g., relevance to their goal, comparable methods, or conflicting results).
- Do not repeat long excerpts; paraphrase or quote short phrases as needed.`;

    let user = '';
    if (params.researchFocus) {
      user += `User research focus: ${params.researchFocus}\n\n`;
    }
    user += `Current paper section:\n---\n${params.context?.currentSection || 'No context available.'}\n---\n\n`;
    
    if (params.conversationHistory?.length > 0) {
      user += 'Previous conversation:\n';
      params.conversationHistory.slice(-3).forEach(turn => {
        user += `User: ${turn.user}\nAssistant: ${turn.assistant}\n\n`;
      });
    }
    
    user += `Question: ${params.question}\n\n`;
    user += 'Answer based on the context above. If the context does not contain enough information, say so.';

    return { system, user };
  }

  /**
   * Load summary prompt template
   * @param {Object} params - { paperContext, summaryGoal, focusWeight?, userResearchContext? }
   * @returns {Object} { system, user } prompts
   */
  static loadSummaryPrompt(params) {
    const system = `You are an expert at summarizing academic papers. You produce clear, structured summaries with bullet points. Your summary is tailored to the user's stated goal: they may care most about methods, the literature gap (what's new / what's missing), or results. You will receive a "summary goal" and optional "focus weight"; emphasize that dimension without omitting the others.

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
- If the user provided research context, briefly relate the paper to it in one bullet under the most relevant section (or under Objective).`;

    let user = `Summary goal: ${params.summaryGoal || 'balanced'}\n`;
    user += `Focus weight: ${params.focusWeight || 'medium'}\n\n`;
    
    if (params.userResearchContext) {
      user += `User's research context (tailor summary relevance to this): ${params.userResearchContext}\n\n`;
    }
    
    user += `Paper to summarize:\n---\n${params.paperContext}\n---\n\n`;
    user += 'Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize the dimension indicated by the summary goal. Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.';

    return { system, user };
  }

  /**
   * Load term definition prompt template
   * @param {Object} params - { term, excerpt }
   * @returns {Object} { system, user } prompts
   */
  static loadTermDefinitionPrompt(params) {
    const system = `You are an expert academic terminology assistant. Given a term that the user has highlighted in a paper, you will:

1. Define the term in a way that is relevant to how it is used in this paper (contextual definition).
2. Provide a simplified, plain-language explanation suitable for quick reading.
3. Extract 1–3 short usage examples from the provided paper excerpt (direct quotes or close paraphrases).
4. Suggest 0–3 further reference links (e.g. Wikipedia, standard textbook, or key paper) when helpful. Use stable URLs only.

Respond only with valid JSON. No markdown code fences, no extra text before or after the JSON. Use the exact keys: term, definition, simplified_explanation, usage_examples, reference_links.`;

    const user = `Term to define: "${params.term}"

Paper excerpt (use this for context and usage examples):
---
${params.excerpt}
---

Return valid JSON with these keys only:
- term (string): the term being defined, as used in the paper
- definition (string): precise, contextually relevant definition for this paper
- simplified_explanation (string): 1–2 sentences in plain language
- usage_examples (array of strings): 1–3 short quotes or paraphrases from the excerpt above
- reference_links (array of objects with "title" and "url"): 0–3 further reading links`;

    return { system, user };
  }
}
