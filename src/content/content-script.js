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
    const root = document.querySelector('[data-bioscript-main]') ||
                 document.querySelector('article') ||
                 document.querySelector('[role="main"]');
    
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
    const text = blocks.map(block => block.textContent.trim()).join('\n\n');

    // Try to get section ID
    const sectionId = getSectionId(blocks);

    return {
      text,
      sectionId,
      scrollY: viewport.scrollY,
      source: 'html'
    };
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
      return extractVisibleFromHTML(viewport);
    } else {
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
