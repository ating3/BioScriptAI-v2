/**
 * Context Management System
 * Central orchestrator for gathering and managing paper context
 * Based on ARCHITECTURE.md and SCREEN_INFERENCE_PIPELINE.md
 */

export class ContextManager {
  constructor() {
    this.currentContext = null;
    this.scrollBuffer = [];
    this.maxBufferChars = 6000;
    this.maxBufferEntries = 5;
    this.sourceId = null;
  }

  /**
   * Update context from visible viewport
   * @param {Object} visibleChunk - { text, pageOrSection, scrollY, source }
   */
  updateFromVisibleChunk(visibleChunk) {
    if (!visibleChunk?.text) return;

    const entry = {
      text: visibleChunk.text,
      scrollY: visibleChunk.scrollY,
      pageOrSection: visibleChunk.pageOrSection,
      source: visibleChunk.source,
      timestamp: Date.now()
    };

    this.scrollBuffer.push(entry);
    this.mergeOverlappingEntries();
    this.dedupeBySource();
    this.trimToMaxEntries();
    this.trimToMaxChars();
  }

  /**
   * Merge overlapping entries (same page/section, adjacent scroll)
   */
  mergeOverlappingEntries() {
    if (this.scrollBuffer.length < 2) return;

    const merged = [];
    let current = this.scrollBuffer[0];

    for (let i = 1; i < this.scrollBuffer.length; i++) {
      const next = this.scrollBuffer[i];
      
      // Same page/section and adjacent scroll positions
      if (current.pageOrSection === next.pageOrSection &&
          Math.abs(current.scrollY - next.scrollY) < 100) {
        current.text += '\n\n' + next.text;
        current.scrollY = Math.max(current.scrollY, next.scrollY);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
    this.scrollBuffer = merged;
  }

  /**
   * Deduplicate by source and section; keep distinct scroll positions so scroll updates are not dropped.
   * When pageOrSection is null (common for HTML), use a scroll bucket so different viewports are kept.
   * Keeps the most recent entry per key so scrolling updates the context.
   */
  dedupeBySource() {
    if (!this.sourceId) return;

    const scrollBucketSize = 400; // px: same bucket = same general scroll region
    const latestByKey = new Map();
    for (const entry of this.scrollBuffer) {
      const sectionPart = entry.pageOrSection != null ? String(entry.pageOrSection) : `scroll-${Math.floor(entry.scrollY / scrollBucketSize)}`;
      const key = `${this.sourceId}-${sectionPart}`;
      latestByKey.set(key, entry); // later entry overwrites => keep most recent
    }
    this.scrollBuffer = Array.from(latestByKey.values());
  }

  /**
   * Trim to max entries (keep most recent)
   */
  trimToMaxEntries() {
    if (this.scrollBuffer.length > this.maxBufferEntries) {
      this.scrollBuffer = this.scrollBuffer.slice(-this.maxBufferEntries);
    }
  }

  /**
   * Trim to max characters (from oldest entries)
   */
  trimToMaxChars() {
    let total = 0;
    const trimmed = [];
    
    for (let i = this.scrollBuffer.length - 1; i >= 0; i--) {
      const entry = this.scrollBuffer[i];
      if (total + entry.text.length > this.maxBufferChars) break;
      trimmed.unshift(entry);
      total += entry.text.length;
    }
    
    this.scrollBuffer = trimmed;
  }

  /**
   * Get minimal context for LLM
   * @returns {string} Combined context string
   */
  getMinimalContextForLLM() {
    if (this.scrollBuffer.length === 0) return '';

    const sorted = [...this.scrollBuffer].sort((a, b) => b.timestamp - a.timestamp);
    const parts = [];
    let total = 0;

    for (const entry of sorted) {
      if (total + entry.text.length > this.maxBufferChars) break;
      parts.unshift(entry.text);
      total += entry.text.length;
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Set current paper context
   * @param {Object} context - { title, abstract, url, sourceId }
   */
  setCurrentPaper(context) {
    this.currentContext = context;
    this.sourceId = context.sourceId || context.url;
  }

  /**
   * Clear context buffer
   */
  clear() {
    this.scrollBuffer = [];
    this.currentContext = null;
    this.sourceId = null;
  }

  /**
   * Get full context for prompt building
   * @param {Object} options - { includeHistory, includeResearchFocus }
   * @returns {Object} Context object for prompt
   */
  buildPromptContext(options = {}) {
    return {
      currentSection: this.getMinimalContextForLLM(),
      paperTitle: this.currentContext?.title,
      paperUrl: this.currentContext?.url,
      researchFocus: options.researchFocus || null,
      conversationHistory: options.conversationHistory || []
    };
  }
}
