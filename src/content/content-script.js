/**
 * Content Script for PDF/HTML Detection and Text Extraction
 * Based on SCREEN_INFERENCE_PIPELINE.md
 */

(function() {
  'use strict';

  /**
   * Detect page type
   */
  function detectPageType() {
    const url = window.location.href;
    
    // PDF detection
    if (url.includes('.pdf') || 
        url.includes('pdfjs') ||
        document.querySelector('embed[type="application/pdf"]') ||
        document.querySelector('object[type="application/pdf"]')) {
      return 'pdf';
    }
    
    // Known article/journal hosts: treat as HTML so we always try to extract (DOM may vary)
    if (url.includes('pubmed.ncbi.nlm.nih.gov') || url.includes('ncbi.nlm.nih.gov') ||
        url.includes('frontiersin.org') || url.includes('doi.org') ||
        url.includes('nature.com') || url.includes('plos.org') || url.includes('sciencedirect.com') ||
        url.includes('springer.com') || url.includes('biomedcentral.com') || url.includes('mdpi.com')) {
      return 'html';
    }
    
    // HTML article detection
    if (document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('.paper-content') ||
        document.querySelector('.abstract')) {
      return 'html';
    }
    
    return 'unsupported';
  }

  /**
   * Extract visible text from PDF
   */
  function extractVisibleFromPDF(viewport) {
    const textLayer = document.querySelector('.textLayer');
    if (!textLayer) {
      return { text: null, pageIndex: null, scrollY: viewport.scrollY, source: 'pdf_no_text' };
    }

    const spans = textLayer.querySelectorAll('span');
    const visibleSpans = [];

    for (const span of spans) {
      const rect = span.getBoundingClientRect();
      if (intersects(rect, viewport)) {
        visibleSpans.push(span);
      }
    }

    // Sort top-to-bottom, left-to-right
    visibleSpans.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      if (Math.abs(rectA.top - rectB.top) > 5) {
        return rectA.top - rectB.top;
      }
      return rectA.left - rectB.left;
    });

    const text = Array.from(visibleSpans)
      .map(span => span.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Try to get page number from viewer
    const pageNumber = getPageNumberForViewport(viewport);

    return {
      text,
      pageIndex: pageNumber,
      scrollY: viewport.scrollY,
      source: 'pdf'
    };
  }

  /**
   * Extract visible text from HTML
   */
  function extractVisibleFromHTML(viewport) {
    const url = window.location.href;
    const isKnownArticleSite = url.includes('pubmed.ncbi.nlm.nih.gov') || url.includes('ncbi.nlm.nih.gov') ||
      url.includes('frontiersin.org') || url.includes('nature.com') || url.includes('plos.org') ||
      url.includes('sciencedirect.com') || url.includes('springer.com') || url.includes('biomedcentral.com') || url.includes('mdpi.com');

    let root = document.querySelector('[data-bioscript-main]') ||
               document.querySelector('article') ||
               document.querySelector('[role="main"]');
    // Known article sites: fallback to main, common IDs, or body when standard selectors miss
    if (!root && isKnownArticleSite) {
      root = document.querySelector('main') ||
             document.querySelector('#main_content') ||
             document.querySelector('#content') ||
             document.querySelector('[role="main"]') ||
             document.querySelector('.article-body') ||
             document.querySelector('.c-article-body') ||
             document.querySelector('#article-body') ||
             document.body;
    }

    if (!root) {
      return { text: null, sectionId: null, scrollY: viewport.scrollY, source: 'no_content' };
    }

    const visibleNodes = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent) continue;
      
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && intersects(rect, viewport)) {
        visibleNodes.push(node);
      }
    }

    // Group into blocks (paragraphs)
    const blocks = groupIntoBlocks(visibleNodes);
    let text = blocks.map(block => block.textContent.trim()).join('\n\n');

    // Known article sites: if viewport filtering gave little/no text (e.g. SPA or off-screen layout), take all text from root
    const MIN_VISIBLE_CHARS = 400;
    const MAX_FULL_TEXT_CHARS = 120000;
    if (isKnownArticleSite && (!text || text.trim().length < MIN_VISIBLE_CHARS)) {
      const skipTags = new Set(['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'IFRAME', 'NOSCRIPT']);
      const allTexts = [];
      const fullWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let n;
      while (n = fullWalker.nextNode()) {
        const parent = n.parentElement;
        if (!parent) continue;
        const tag = parent.tagName && parent.tagName.toUpperCase();
        if (skipTags.has(tag)) continue;
        const t = n.textContent.trim();
        if (t) allTexts.push(t);
      }
      const fullText = allTexts.join(' ').replace(/\s+/g, ' ').trim();
      if (fullText && fullText.length > (text || '').length) {
        text = fullText.length > MAX_FULL_TEXT_CHARS ? fullText.slice(0, MAX_FULL_TEXT_CHARS) + '…' : fullText;
      }
    }

    // Try to get section ID
    const sectionId = getSectionId(blocks);

    return {
      text: text || null,
      sectionId,
      scrollY: viewport.scrollY,
      source: 'html'
    };
  }

  /**
   * Extract visible text from document.body when no article/main is found
   */
  function extractVisibleFromBody(viewport) {
    const root = document.body;
    if (!root) return { text: null, scrollY: viewport.scrollY, source: 'no_content' };

    const visibleTexts = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );

    const skipTags = new Set(['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'IFRAME', 'NOSCRIPT']);
    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName && parent.tagName.toUpperCase();
      if (skipTags.has(tag)) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && intersects(rect, viewport)) {
        const t = node.textContent.trim();
        if (t) visibleTexts.push(t);
      }
    }

    const text = visibleTexts.join(' ').replace(/\s+/g, ' ').trim() || null;
    return { text, scrollY: viewport.scrollY, source: 'html' };
  }

  /**
   * Get visible context
   */
  function getVisibleContext() {
    const viewport = {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollY: window.scrollY
    };

    const pageType = detectPageType();

    if (pageType === 'pdf') {
      return extractVisibleFromPDF(viewport);
    } else if (pageType === 'html') {
      const result = extractVisibleFromHTML(viewport);
      // If we got little or no text (e.g. viewport/layout quirks), try body-based extraction
      if (!result.text || result.text.trim().length < 300) {
        const bodyResult = extractVisibleFromBody(viewport);
        if (bodyResult.text && bodyResult.text.length > (result.text || '').length) {
          return bodyResult;
        }
      }
      return result;
    } else {
      // Fallback: try to get any visible text from the page
      const fallback = extractVisibleFromBody(viewport);
      if (fallback.text && fallback.text.trim().length > 100) {
        return fallback;
      }
      return { text: null, source: 'unsupported' };
    }
  }

  /**
   * Helper: Check if rect intersects viewport
   */
  function intersects(rect, viewport) {
    return !(rect.bottom < viewport.top ||
             rect.top > viewport.top + viewport.height ||
             rect.right < viewport.left ||
             rect.left > viewport.left + viewport.width);
  }

  /**
   * Get page number from PDF viewer
   */
  function getPageNumberForViewport(viewport) {
    // Try common PDF viewer patterns
    const pageIndicator = document.querySelector('.pageIndicator') ||
                          document.querySelector('[data-page-number]');
    if (pageIndicator) {
      const pageNum = pageIndicator.textContent.match(/\d+/);
      return pageNum ? parseInt(pageNum[0]) : null;
    }
    return null;
  }

  /**
   * Group text nodes into blocks
   */
  function groupIntoBlocks(nodes) {
    const blocks = [];
    let currentBlock = [];

    for (const node of nodes) {
      const parent = node.parentElement;
      if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
        if (currentBlock.length > 0 && currentBlock[0].parentElement !== parent) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
        currentBlock.push(node);
      }
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks.map(block => block[0].parentElement);
  }

  /**
   * Get section ID from blocks
   */
  function getSectionId(blocks) {
    if (blocks.length === 0) return null;

    // Look for heading before first block
    const firstBlock = blocks[0];
    let element = firstBlock.previousElementSibling;
    
    while (element) {
      if (element.tagName.match(/^H[1-6]$/)) {
        return element.textContent.trim();
      }
      element = element.previousElementSibling;
    }

    return null;
  }

  // ---- Term highlighter & definition tooltip ----
  const HIGHLIGHT_CLASS = 'bioscript-term-highlight';
  const TOOLTIP_ID = 'bioscript-definition-tooltip';

  function injectTermHighlighterStyles() {
    if (document.getElementById('bioscript-term-styles')) return;
    const style = document.createElement('style');
    style.id = 'bioscript-term-styles';
    style.textContent = `
      .${HIGHLIGHT_CLASS} { background: rgba(255, 212, 0, 0.35); border-radius: 2px; }
      #${TOOLTIP_ID} {
        position: fixed; z-index: 2147483647;
        max-width: 320px; padding: 10px 12px;
        background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 13px; line-height: 1.4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #${TOOLTIP_ID} .bioscript-tooltip-term { font-weight: 700; margin-bottom: 6px; }
      #${TOOLTIP_ID} .bioscript-tooltip-def { color: #333; margin-bottom: 6px; }
      #${TOOLTIP_ID} .bioscript-tooltip-simple { color: #555; font-size: 12px; margin-bottom: 6px; }
      #${TOOLTIP_ID} .bioscript-tooltip-examples { margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      #${TOOLTIP_ID} .bioscript-tooltip-links { margin-top: 6px; font-size: 12px; }
      #${TOOLTIP_ID} .bioscript-tooltip-links a { color: #0066cc; margin-right: 8px; }
      #${TOOLTIP_ID} .bioscript-tooltip-error { color: #c00; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function getExcerptAroundSelection() {
    const ctx = getVisibleContext();
    if (ctx && ctx.text) return ctx.text;
    const sel = window.getSelection();
    if (!sel.rangeCount) return '';
    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const block = node.closest ? node.closest('p, div, li, td, [role="paragraph"]') : null;
    if (!block) return range.toString() || '';
    let excerpt = block.textContent || '';
    const prev = block.previousElementSibling;
    if (prev && (prev.tagName === 'P' || prev.tagName === 'DIV')) excerpt = (prev.textContent || '').trim() + '\n\n' + excerpt;
    const next = block.nextElementSibling;
    if (next && (next.tagName === 'P' || next.tagName === 'DIV')) excerpt = excerpt + '\n\n' + (next.textContent || '').trim();
    return excerpt.slice(0, 4000);
  }

  function tryApplyHighlight(range) {
    try {
      const span = document.createElement('span');
      span.className = HIGHLIGHT_CLASS;
      range.surroundContents(span);
      return span;
    } catch (e) {
      return null;
    }
  }

  function removeExistingTooltip() {
    const el = document.getElementById(TOOLTIP_ID);
    if (el) el.remove();
  }

  function removeExistingHighlights() {
    document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });
  }

  function showDefinitionTooltip(rect, term, excerpt) {
    removeExistingTooltip();
    removeExistingHighlights();

    injectTermHighlighterStyles();

    const tooltip = document.createElement('div');
    tooltip.id = TOOLTIP_ID;
    tooltip.innerHTML = '<span class="bioscript-tooltip-term">' + escapeHtml(term) + '</span><div class="bioscript-tooltip-def">Looking up…</div>';

    const padding = 8;
    let top = rect.bottom + padding;
    let left = rect.left;
    if (top + 200 > window.innerHeight) top = rect.top - 200 - padding;
    if (left + 320 > window.innerWidth) left = window.innerWidth - 320 - padding;
    if (left < padding) left = padding;
    tooltip.style.top = (top + window.scrollY) + 'px';
    tooltip.style.left = (left + window.scrollX) + 'px';

    document.body.appendChild(tooltip);

    function close() {
      tooltip.remove();
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('click', onClickOutside);
    }

    function onEscape(e) {
      if (e.key === 'Escape') close();
    }
    function onClickOutside(e) {
      if (!tooltip.contains(e.target)) close();
    }

    document.addEventListener('keydown', onEscape);
    setTimeout(() => document.addEventListener('click', onClickOutside), 0);

    chrome.runtime.sendMessage({ action: 'defineTerm', term, excerpt }, (response) => {
      if (chrome.runtime.lastError) {
        tooltip.querySelector('.bioscript-tooltip-def').className = 'bioscript-tooltip-def bioscript-tooltip-error';
        tooltip.querySelector('.bioscript-tooltip-def').textContent = 'Extension error. Is the sidebar or LLM connected?';
        return;
      }
      if (!response || !response.success) {
        tooltip.querySelector('.bioscript-tooltip-def').className = 'bioscript-tooltip-def bioscript-tooltip-error';
        tooltip.querySelector('.bioscript-tooltip-def').textContent = response && response.error ? response.error : 'Could not get definition.';
        return;
      }
      const d = response.definition;
      let html = '<span class="bioscript-tooltip-term">' + escapeHtml(d.term || term) + '</span>';
      html += '<div class="bioscript-tooltip-def">' + escapeHtml(d.definition || '') + '</div>';
      if (d.simplified_explanation) html += '<div class="bioscript-tooltip-simple">' + escapeHtml(d.simplified_explanation) + '</div>';
      if (d.usage_examples && d.usage_examples.length) {
        html += '<div class="bioscript-tooltip-examples">Examples: ' + escapeHtml(d.usage_examples.join(' — ')) + '</div>';
      }
      if (d.reference_links && d.reference_links.length) {
        html += '<div class="bioscript-tooltip-links">';
        d.reference_links.forEach(link => {
          const url = (typeof link === 'object' && link.url) ? link.url : link;
          const title = (typeof link === 'object' && link.title) ? link.title : url;
          html += '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(title) + '</a>';
        });
        html += '</div>';
      }
      tooltip.innerHTML = html;
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  document.addEventListener('dblclick', () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const term = (sel && sel.toString && sel.toString()) ? sel.toString().trim() : '';
      if (!term || term.length < 1 || term.length > 150) return;
      const excerpt = getExcerptAroundSelection();
      if (!excerpt) return;

      const range = sel.rangeCount ? sel.getRangeAt(0) : null;
      if (range) tryApplyHighlight(range);
      const rect = range && range.getBoundingClientRect && range.getBoundingClientRect();
      const fallbackRect = rect && rect.width ? rect : { left: 100, bottom: 150, top: 100 };
      showDefinitionTooltip(rect && rect.width ? rect : fallbackRect, term, excerpt);
    }, 10);
  });

  /**
   * Listen for messages from service worker
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVisibleContext') {
      const context = getVisibleContext();
      sendResponse(context);
    }
    return true; // Keep channel open for async
  });

  // Throttled scroll listener
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'scrollDetected',
        url: window.location.href
      });
    }, 300);
  });

})();
