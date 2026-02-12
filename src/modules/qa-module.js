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

    const systemPrompt = `You are an expert academic research assistant. Your role is to answer questions about the paper the user is reading, using only the provided context (current section and any prior excerpts). You do not invent or assume information that is not present in the context.

Guidelines:
- Base every answer on the loaded paper section and, when relevant, on the conversation history and the user's stated research focus.
- If the question cannot be answered from the context, say so clearly and suggest what part of the paper might contain the answer (e.g., "This is likely in the Methods section.").
- For domain-specific questions (methods, results, assumptions, limitations), structure your answer briefly: state the finding, then cite the relevant part of the text (e.g., "The authors state that … [see excerpt].").
- Be concise but precise. Use academic tone without unnecessary hedging when the text supports a clear claim.
- When the user's research focus is provided, tailor answers to how the paper relates to that focus (e.g., relevance to their goal, comparable methods, or conflicting results).
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

    prompt += `Current paper section:\n---\n${context.currentSection || 'No context available.'}\n---\n\n`;

    if (conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      conversationHistory.slice(-3).forEach(turn => {
        prompt += `User: ${turn.user}\nAssistant: ${turn.assistant}\n\n`;
      });
    }

    prompt += `Question: ${question}\n\n`;
    prompt += 'Answer based on the context above. If the context does not contain enough information, say so.';

    return prompt;
  }
}
