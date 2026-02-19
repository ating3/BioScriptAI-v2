/**
 * Service Worker - Main Orchestrator
 * Based on ARCHITECTURE.md
 */

import { ContextManager } from '../core/context-manager.js';
import { LLMService } from '../services/llm-service.js';
import { ZoteroService } from '../services/zotero-service.js';
import { QAModule } from '../modules/qa-module.js';
import { SummarizationModule } from '../modules/summarization-module.js';
import { PromptLoader } from '../utils/prompt-loader.js';

// Initialize services
const contextManager = new ContextManager();
const llmService = new LLMService();
const zoteroService = new ZoteroService();
const qaModule = new QAModule(llmService);
const summarizationModule = new SummarizationModule(llmService);

// Load settings
let settings = {
  screenInferenceEnabled: true,
  cloudAccelerationEnabled: false,
  llmBaseUrl: 'http://localhost:8000'
};

chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
});

/**
 * Handle sidebar opening
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVisibleContext') {
    // Forward to content script
    chrome.tabs.sendMessage(sender.tab.id, { action: 'getVisibleContext' }, (response) => {
      if (response && response.text) {
        contextManager.updateFromVisibleChunk(response);
      }
      sendResponse(response);
    });
    return true;
  }

  if (request.action === 'setPageContext') {
    const { context, title, url } = request;
    if (context && context.text && url) {
      // Clear buffer so we don't mix in chunks from a previous paper/tab
      contextManager.clear();
      contextManager.setCurrentPaper({ title, url, sourceId: url });
      contextManager.updateFromVisibleChunk({
        text: context.text,
        scrollY: context.scrollY ?? 0,
        pageOrSection: context.sectionId ?? null,
        source: context.source ?? 'html'
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'clearPageContext') {
    contextManager.clear();
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'scrollDetected') {
    if (settings.screenInferenceEnabled) {
      // Capture visible context on scroll
      chrome.tabs.sendMessage(sender.tab.id, { action: 'getVisibleContext' }, (response) => {
        if (response && response.text) {
          contextManager.updateFromVisibleChunk({
            text: response.text,
            scrollY: response.scrollY ?? 0,
            pageOrSection: response.sectionId ?? null,
            source: response.source ?? 'html'
          });
          // Notify sidebar so it can update displayed context
          chrome.runtime.sendMessage({ action: 'contextUpdated', context: response }).catch(() => {});
        }
      });
    }
    return true;
  }

  if (request.action === 'answerQuestion') {
    handleAnswerQuestion(request, sendResponse);
    return true;
  }

  if (request.action === 'summarize') {
    handleSummarize(request, sendResponse);
    return true;
  }

  if (request.action === 'getContext') {
    const context = contextManager.buildPromptContext({
      researchFocus: request.researchFocus,
      conversationHistory: request.conversationHistory
    });
    sendResponse({ context });
    return true;
  }

  if (request.action === 'defineTerm') {
    handleDefineTerm(request, sendResponse);
    return true;
  }
});

/**
 * Handle QA request
 */
async function handleAnswerQuestion(request, sendResponse) {
  try {
    const context = contextManager.buildPromptContext({
      researchFocus: request.researchFocus,
      conversationHistory: request.conversationHistory
    });

    const answer = await qaModule.answerQuestion({
      question: request.question,
      context,
      researchFocus: request.researchFocus,
      conversationHistory: request.conversationHistory
    });

    sendResponse({ success: true, answer });
  } catch (error) {
    console.error('QA error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle summarization request
 */
async function handleSummarize(request, sendResponse) {
  try {
    const context = contextManager.getMinimalContextForLLM();
    
    const summary = await summarizationModule.summarize({
      paperContext: context || request.paperContext,
      summaryGoal: request.summaryGoal || 'balanced',
      focusWeight: request.focusWeight || 'medium',
      userResearchContext: request.userResearchContext
    });

    sendResponse({ success: true, summary });
  } catch (error) {
    console.error('Summarization error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle term definition request (for highlight tooltip)
 */
async function handleDefineTerm(request, sendResponse) {
  try {
    const { term, excerpt } = request;
    if (!term || !excerpt) {
      sendResponse({ success: false, error: 'Missing term or excerpt' });
      return;
    }

    const { system, user } = PromptLoader.loadTermDefinitionPrompt({ term, excerpt });
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];

    const result = await llmService.chat({
      messages,
      temperature: 0.3,
      max_tokens: 600
    });

    const raw = Array.isArray(result.content) ? result.content[0] : result.content;
    if (!raw || typeof raw !== 'string') {
      sendResponse({ success: false, error: 'Empty response from model' });
      return;
    }

    // Strip markdown code fence if present
    let jsonStr = raw.trim();
    const fence = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fence) jsonStr = fence[1].trim();

    const definition = JSON.parse(jsonStr);
    sendResponse({ success: true, definition });
  } catch (error) {
    console.error('Define term error:', error);
    sendResponse({ success: false, error: error.message || 'Failed to get definition' });
  }
}

/**
 * Handle Zotero operations
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'zotero') {
    handleZoteroRequest(request, sendResponse);
    return true;
  }
});

async function handleZoteroRequest(request, sendResponse) {
  try {
    const { operation, params } = request;

    switch (operation) {
      case 'initialize':
        const success = await zoteroService.initialize(params.apiKey);
        sendResponse({ success });
        break;

      case 'createCollection':
        const collectionKey = await zoteroService.createCollection(params.name);
        sendResponse({ success: true, collectionKey });
        break;

      case 'listCollections':
        const collections = await zoteroService.listCollections();
        sendResponse({ success: true, collections });
        break;

      case 'createItem':
        const itemKey = await zoteroService.createItem(params.itemData);
        sendResponse({ success: true, itemKey });
        break;

      case 'addItemToCollection':
        await zoteroService.addItemToCollection(params.itemKey, params.collectionKey);
        sendResponse({ success: true });
        break;

      case 'exportCollection':
        const exportData = await zoteroService.exportCollection(params.collectionKey, params.format);
        sendResponse({ success: true, data: exportData });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown operation' });
    }
  } catch (error) {
    console.error('Zotero error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
