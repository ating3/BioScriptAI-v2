/**
 * Summarization Module
 * Based on SUMMARY_PROMPT_TEMPLATE.md
 */

import { LLMService } from '../services/llm-service.js';

export class SummarizationModule {
  constructor(llmService) {
    this.llmService = llmService;
  }

  /**
   * Generate tailored summary
   * @param {Object} params - { paperContext, summaryGoal, focusWeight?, userResearchContext? }
   * @returns {Promise<Object>} Summary with sections
   */
  async summarize(params) {
    const { paperContext, summaryGoal = 'balanced', focusWeight = 'medium', userResearchContext } = params;

    const systemPrompt = `You are an expert at summarizing academic papers. You produce clear, structured summaries with bullet points. Your summary is tailored to the user's stated goal: they may care most about methods, the literature gap (what's new / what's missing), or results. You will receive a "summary goal" and optional "focus weight"; emphasize that dimension without omitting the others.

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

    const userPrompt = this.buildUserPrompt({
      paperContext,
      summaryGoal,
      focusWeight,
      userResearchContext
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.llmService.chat({ messages, max_tokens: 1500 });
    return this.parseSummary(response.content);
  }

  /**
   * Build user prompt from template
   */
  buildUserPrompt(params) {
    const { paperContext, summaryGoal, focusWeight, userResearchContext } = params;
    
    let prompt = `Summary goal: ${summaryGoal}\n`;
    prompt += `Focus weight: ${focusWeight}\n\n`;

    if (userResearchContext) {
      prompt += `User's research context (tailor summary relevance to this): ${userResearchContext}\n\n`;
    }

    prompt += `Paper to summarize:\n---\n${paperContext}\n---\n\n`;
    prompt += 'Produce a tailored summary with the four sections (Objective, Methodology, Results, Limitations), each as bullet points. Emphasize the dimension indicated by the summary goal. Output in markdown with **Objective**, **Methodology**, **Results**, **Limitations** as headers and bullet lists under each.';

    return prompt;
  }

  /**
   * Parse summary from LLM response
   * @param {string} content - LLM response
   * @returns {Object} Structured summary
   */
  parseSummary(content) {
    const sections = {
      objective: [],
      methodology: [],
      results: [],
      limitations: []
    };

    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.match(/^\*\*Objective\*\*/i)) {
        currentSection = 'objective';
      } else if (line.match(/^\*\*Methodology\*\*/i)) {
        currentSection = 'methodology';
      } else if (line.match(/^\*\*Results\*\*/i)) {
        currentSection = 'results';
      } else if (line.match(/^\*\*Limitations\*\*/i)) {
        currentSection = 'limitations';
      } else if (currentSection && line.trim().startsWith('-')) {
        sections[currentSection].push(line.trim().substring(1).trim());
      }
    }

    return sections;
  }
}
