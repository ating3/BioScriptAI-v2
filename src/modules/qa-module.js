/**
 * Question Answering Module
 * Based on QA_PROMPT_TEMPLATE.md
 */

import { LLMService } from '../services/llm-service.js';

export class QAModule {
  constructor(llmService) {
    this.llmService = llmService;
  }

  /**
   * Answer a question about the current paper
   * @param {Object} params - { question, context, researchFocus?, conversationHistory? }
   * @returns {Promise<string>} Answer
   */
  async answerQuestion(params) {
    const { question, context, researchFocus, conversationHistory = [] } = params;

    const systemPrompt = `You are an expert academic research assistant. Your role is to answer questions about the paper the user is reading.

Source of truth:
- The vast majority of your answer (all substantive content) must come only from the "Current paper section" block. That block is what is visible to the user and may change if they scroll.
- Conversation history is for context only: use it to tie back to earlier points if useful, avoid repeating yourself, or understand what the user already asked—do not use it as a source of facts or topics for your answer. If something appears only in conversation history and not in the current paper section, do not include it.
- Do not invent or assume information. Do not bring in topics (e.g. different diseases, papers, or findings) that are not in the current paper section.

Guidelines:
- Always answer from the current "Current paper section" content. If the user asks again (e.g. "summarize this section"), give a fresh answer from that section—do not repeat or paraphrase your previous reply; the section may be different now.
- If the question cannot be answered from the current section, say so clearly and suggest what part of the paper might contain the answer.
- For domain-specific questions (methods, results, assumptions, limitations), state the finding and cite the relevant part of the current section text.
- Be concise but precise. Use academic tone when the text supports a clear claim.
- When the user's research focus is provided, tailor answers to how the paper relates to that focus.
- Do not repeat long excerpts; paraphrase or quote short phrases as needed.`;

    const userPrompt = this.buildUserPrompt({
      question,
      context,
      researchFocus,
      conversationHistory
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.llmService.chat({ messages });
    return response.content;
  }

  /**
   * Build user prompt from template
   * @param {Object} params - Template parameters
   * @returns {string} Formatted prompt
   */
  buildUserPrompt(params) {
    const { question, context, researchFocus, conversationHistory } = params;
    
    let prompt = '';

    if (researchFocus) {
      prompt += `User research focus: ${researchFocus}\n\n`;
    }

    prompt += `Current paper section (visible content; may have changed if the user scrolled):\n---\n${context.currentSection || 'No context available.'}\n---\n\n`;

    // Include only previous user questions (not assistant replies) so the model cannot copy or drift toward a different section's answer
    if (conversationHistory.length > 0) {
      prompt += 'Previous questions from the user (the section may have changed since; answer only from the current section above):\n';
      conversationHistory.slice(-3).forEach(turn => {
        prompt += `- ${turn.user}\n`;
      });
      prompt += '\n';
    }

    prompt += `Question: ${question}\n\n`;
    prompt += 'Answer only from the "Current paper section" above. If the section changed (e.g. after scrolling), summarize or explain only what is in the current section. If the context does not contain enough information, say so.';

    return prompt;
  }
}
