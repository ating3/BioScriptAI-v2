// Bioscript Content Script — MutationObserver + ScrollObserver + Double-click trigger

;(function () {
  'use strict'

  let currentSection = 'Body'
  let viewportText = ''
  let lastPaperData = null
  let scrollTimer = null

  // ─── Paper Detection ───────────────────────────────────────────────
  function detectPaper() {
    const url = window.location.href
    const source = detectSource(url)
    if (!source) return

    const title =
      document.querySelector('h1.title, h1[class*="title"], .article-title, #page-title, h1')?.textContent?.trim() ||
      document.title

    const authors = Array.from(
      document.querySelectorAll('.authors, .author-name, [class*="author"]')
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .slice(0, 10)

    const abstract =
      document.querySelector('#abstract, .abstract, [class*="abstract"]')?.textContent?.trim() || ''

    const doi =
      document.querySelector('[class*="doi"], a[href*="doi.org"]')?.textContent?.trim() ||
      document.querySelector('meta[name="citation_doi"]')?.content ||
      ''

    const journal =
      document.querySelector('meta[name="citation_journal_title"]')?.content ||
      document.querySelector('[class*="journal-title"]')?.textContent?.trim() ||
      ''

    const year =
      document.querySelector('meta[name="citation_publication_date"]')?.content?.slice(0, 4) ||
      document.querySelector('meta[name="citation_date"]')?.content?.slice(0, 4) ||
      ''

    const paperData = {
      id: btoa(url).slice(0, 16),
      title,
      authors,
      abstract,
      doi,
      journal,
      year,
      url,
      source,
    }

    lastPaperData = paperData
    chrome.runtime.sendMessage({ type: 'PAPER_DETECTED', data: paperData })
  }

  function detectSource(url) {
    if (url.includes('pubmed.ncbi') || url.includes('ncbi.nlm.nih.gov/pmc') || url.includes('pmc.ncbi.nlm.nih.gov')) return 'pubmed'
    if (url.includes('arxiv.org')) return 'arxiv'
    if (url.includes('nature.com')) return 'nature'
    if (url.includes('science.org')) return 'science'
    if (url.includes('cell.com')) return 'cell'
    if (url.includes('biorxiv.org')) return 'biorxiv'
    if (url.includes('medrxiv.org')) return 'medrxiv'
    if (url.includes('plos.org')) return 'plos'
    if (url.includes('elifesciences.org')) return 'elife'
    return null
  }

  // ─── Section Detection ─────────────────────────────────────────────
  function detectCurrentSection() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
    let closestSection = 'Body'
    let closestTop = -Infinity

    for (const h of headings) {
      const rect = h.getBoundingClientRect()
      if (rect.top <= 80 && rect.top > closestTop) {
        closestTop = rect.top
        const text = h.textContent.toLowerCase()
        if (text.includes('abstract')) closestSection = 'Abstract'
        else if (text.includes('introduction')) closestSection = 'Introduction'
        else if (text.includes('method') || text.includes('material')) closestSection = 'Methodology'
        else if (text.includes('result')) closestSection = 'Results'
        else if (text.includes('discussion')) closestSection = 'Discussion'
        else if (text.includes('conclusion')) closestSection = 'Conclusion'
        else if (text.includes('reference') || text.includes('bibliography')) closestSection = 'References'
        else closestSection = h.textContent.trim().slice(0, 40)
      }
    }
    return closestSection
  }

  // ─── Viewport Text Extraction ──────────────────────────────────────
  function getViewportText() {
    const elements = document.querySelectorAll('p, li, td, th, blockquote, figcaption')
    const viewportHeight = window.innerHeight
    const texts = []

    for (const el of elements) {
      const rect = el.getBoundingClientRect()
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const text = el.textContent.trim()
        if (text.length > 20) texts.push(text)
      }
    }

    return texts.join(' ').slice(0, 2000)
  }

  // ─── Full Paper Text ───────────────────────────────────────────────
  function getFullPaperText() {
    const article =
      document.querySelector('article, main, .article-body, #article-body, .paper-content') ||
      document.body
    return article.innerText?.slice(0, 15000) || ''
  }

  // ─── Scroll Handler ────────────────────────────────────────────────
  function onScroll() {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      const newSection = detectCurrentSection()
      const newViewportText = getViewportText()

      if (newSection !== currentSection || newViewportText !== viewportText) {
        currentSection = newSection
        viewportText = newViewportText

        chrome.runtime.sendMessage({
          type: 'VIEWPORT_UPDATE',
          data: {
            section: currentSection,
            viewportText,
            fullText: getFullPaperText(),
            url: window.location.href,
          },
        })
      }
    }, 300)
  }

  // ─── Define popup: selectionchange + debounce (no mouseup — more reliable across sites) ──────────────
  let definePopupEl = null
  let definePopupShownAt = 0
  let defineSelectionDebounce = null

  function showDefinePopup(rect, selectedText) {
    if (definePopupEl) {
      definePopupEl.remove()
      definePopupEl = null
    }
    let left = rect.left + rect.width / 2 - 28
    let top = rect.top - 32
    left = Math.max(8, Math.min(left, window.innerWidth - 70))
    top = Math.max(8, Math.min(top, window.innerHeight - 36))

    const popup = document.createElement('div')
    popup.id = 'bioscript-define-popup'
    popup.textContent = 'Define'
    popup.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'padding:6px 12px',
      'font-size:13px',
      'font-family:system-ui,sans-serif',
      'background:#2563EB',
      'color:white',
      'border-radius:6px',
      'cursor:pointer',
      'box-shadow:0 2px 12px rgba(0,0,0,0.25)',
      'left:' + left + 'px',
      'top:' + top + 'px',
    ].join(';')
    popup.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (!selectedText) return
      popup.textContent = 'Defining…'
      popup.style.pointerEvents = 'none'
      chrome.runtime.sendMessage(
        {
          type: 'DEFINE_WORD',
          data: {
            word: selectedText,
            context: getViewportText().slice(0, 500),
            url: window.location.href,
          },
        },
        function (response) {
          if (definePopupEl) {
            definePopupEl.remove()
            definePopupEl = null
          }
          window.getSelection()?.removeAllRanges()
          if (chrome.runtime.lastError) {
            showDefineError(chrome.runtime.lastError.message || 'Extension error')
            return
          }
          if (response && !response.success) {
            showDefineError(response.error || 'Define failed')
          }
        }
      )
    })
    document.body.appendChild(popup)
    definePopupEl = popup
    definePopupShownAt = Date.now()
  }

  function hideDefinePopup() {
    if (definePopupEl) {
      definePopupEl.remove()
      definePopupEl = null
    }
  }

  function showDefineError(msg) {
    var toast = document.createElement('div')
    toast.id = 'bioscript-define-toast'
    toast.textContent = msg
    toast.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'top:12px',
      'left:50%',
      'transform:translateX(-50%)',
      'padding:8px 14px',
      'font-size:12px',
      'font-family:system-ui,sans-serif',
      'background:#B91C1C',
      'color:white',
      'border-radius:8px',
      'box-shadow:0 2px 12px rgba(0,0,0,0.3)',
      'max-width:90%',
    ].join(';')
    document.body.appendChild(toast)
    setTimeout(function () {
      if (toast.parentNode) toast.remove()
    }, 4000)
  }

  function onSelectionChange() {
    if (manualSelectMode) return
    if (defineSelectionDebounce) clearTimeout(defineSelectionDebounce)
    defineSelectionDebounce = setTimeout(function () {
      defineSelectionDebounce = null
      const sel = window.getSelection()
      const text = (sel && sel.toString()) ? sel.toString().trim() : ''
      if (!text || text.length > 80) {
        hideDefinePopup()
        return
      }
      try {
        if (sel.rangeCount < 1) {
          hideDefinePopup()
          return
        }
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          hideDefinePopup()
          return
        }
        showDefinePopup(rect, text)
      } catch (err) {
        hideDefinePopup()
      }
    }, 180)
  }

  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('click', function (e) {
    if (!definePopupEl) return
    if (e.target === definePopupEl || definePopupEl.contains(e.target)) return
    if (Date.now() - definePopupShownAt < 300) return
    hideDefinePopup()
  })

  // ─── Manual Select Tool ────────────────────────────────────────────
  let manualSelectMode = false

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'ENABLE_MANUAL_SELECT') {
      manualSelectMode = true
      document.body.style.cursor = 'crosshair'
    }
    if (message.type === 'DISABLE_MANUAL_SELECT') {
      manualSelectMode = false
      document.body.style.cursor = ''
    }
    if (message.type === 'DEFINE_SELECTION' && message.text) {
      chrome.runtime.sendMessage({
        type: 'DEFINE_WORD',
        data: {
          word: message.text.trim(),
          context: getViewportText().slice(0, 500),
          url: window.location.href,
        },
      })
    }
    if (message.type === 'GET_FULL_TEXT') {
      chrome.runtime.sendMessage({
        type: 'FULL_TEXT_RESPONSE',
        data: { fullText: getFullPaperText(), url: window.location.href },
      })
    }
    // Sidepanel requesting current paper data on mount
    if (message.type === 'REQUEST_PAPER_DATA') {
      if (lastPaperData) {
        sendResponse({ found: true, data: lastPaperData })
      } else {
        // Try detecting now (page may already be loaded)
        const url = window.location.href
        const source = detectSource(url)
        if (source) {
          detectPaper()
          sendResponse({ found: !!lastPaperData, data: lastPaperData })
        } else {
          sendResponse({ found: false })
        }
      }
      return true
    }
  })

  document.addEventListener('mouseup', function () {
    if (!manualSelectMode) return
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (text && text.length > 10) {
      chrome.runtime.sendMessage({
        type: 'MANUAL_TEXT_SELECTED',
        data: { text, url: window.location.href },
      })
    }
  })

  // ─── MutationObserver for SPAs ─────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (!lastPaperData) detectPaper()
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // ─── Init ──────────────────────────────────────────────────────────
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('scroll', hideDefinePopup, { passive: true })

  // Initial detection
  if (document.readyState === 'complete') {
    detectPaper()
    currentSection = detectCurrentSection()
    viewportText = getViewportText()
  } else {
    window.addEventListener('load', () => {
      detectPaper()
      currentSection = detectCurrentSection()
      viewportText = getViewportText()
    })
  }
})()
