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

    // ── Title ─────────────────────────────────────────────────────────────────
    const title =
      document.querySelector('meta[name="citation_title"]')?.content ||
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="dc.title"], meta[name="DC.title"]')?.content ||
      document.querySelector('h1.title, h1[class*="title"], .article-title, #page-title, [class*="article-header"] h1, [class*="paper-title"]')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title

    // ── Authors ───────────────────────────────────────────────────────────────
    const citationAuthorMetas = Array.from(document.querySelectorAll('meta[name="citation_author"]'))
    let authors = []
    if (citationAuthorMetas.length > 0) {
      authors = citationAuthorMetas.map((el) => el.content).filter(Boolean).slice(0, 10)
    } else {
      authors = Array.from(
        document.querySelectorAll(
          '.authors a, .author-name, [class*="author-name"], [class*="authors"] a, ' +
          '[rel="author"], [itemprop="author"] [itemprop="name"], ' +
          'meta[name="dc.creator"], meta[name="DC.creator"]'
        )
      )
        .map((el) => el.content || el.textContent.trim())
        .filter(Boolean)
        .slice(0, 10)
    }

    // ── Abstract ─────────────────────────────────────────────────────────────
    const abstract =
      document.querySelector('meta[name="citation_abstract"]')?.content ||
      document.querySelector('meta[name="dc.description"], meta[name="DC.description"]')?.content ||
      document.querySelector('meta[property="og:description"]')?.content ||
      document.querySelector('#abstract, .abstract, [class*="abstract"] p, [id*="abstract"] p, section[aria-label*="abstract" i] p')?.textContent?.trim() ||
      document.querySelector('[class*="abstract"], [id*="abstract"]')?.textContent?.trim() ||
      document.querySelector('meta[name="description"]')?.content ||
      ''

    // ── DOI ───────────────────────────────────────────────────────────────────
    const rawDoi =
      document.querySelector('meta[name="citation_doi"]')?.content ||
      document.querySelector('meta[name="dc.identifier"], meta[name="DC.identifier"]')?.content ||
      document.querySelector('[class*="doi"] a, a[href*="doi.org/10."]')?.href ||
      document.querySelector('a[href*="doi.org"]')?.href ||
      ''
    const doi = rawDoi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')

    // ── Journal ───────────────────────────────────────────────────────────────
    const journal =
      document.querySelector('meta[name="citation_journal_title"]')?.content ||
      document.querySelector('meta[name="citation_conference_title"]')?.content ||
      document.querySelector('meta[name="dc.source"], meta[name="DC.source"]')?.content ||
      document.querySelector('[class*="journal-title"], [class*="journal_title"], [itemprop="isPartOf"] [itemprop="name"]')?.textContent?.trim() ||
      ''

    // ── Year ─────────────────────────────────────────────────────────────────
    const year =
      document.querySelector('meta[name="citation_publication_date"]')?.content?.slice(0, 4) ||
      document.querySelector('meta[name="citation_date"]')?.content?.slice(0, 4) ||
      document.querySelector('meta[name="citation_year"]')?.content ||
      document.querySelector('meta[name="dc.date"], meta[name="DC.date"]')?.content?.slice(0, 4) ||
      document.querySelector('[class*="pub-date"], [class*="publication-date"], time[datetime]')?.getAttribute('datetime')?.slice(0, 4) ||
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

  function detectSource(u) {
    // ── Major preprint & biomedical databases ──────────────────────────────
    if (u.includes('pubmed.ncbi') || u.includes('ncbi.nlm.nih.gov/pmc') || u.includes('pmc.ncbi.nlm.nih.gov')) return 'pubmed'
    if (u.includes('arxiv.org')) return 'arxiv'
    if (u.includes('biorxiv.org')) return 'biorxiv'
    if (u.includes('medrxiv.org')) return 'medrxiv'
    if (u.includes('chemrxiv.org')) return 'chemrxiv'
    if (u.includes('ssrn.com')) return 'ssrn'
    if (u.includes('researchsquare.com')) return 'researchsquare'
    if (u.includes('preprints.org')) return 'preprints'
    if (u.includes('osf.io')) return 'osf'
    // ── Major publishers ──────────────────────────────────────────────────
    if (u.includes('nature.com')) return 'nature'
    if (u.includes('science.org')) return 'science'
    if (u.includes('cell.com')) return 'cell'
    if (u.includes('plos.org')) return 'plos'
    if (u.includes('elifesciences.org')) return 'elife'
    if (u.includes('nejm.org')) return 'nejm'
    if (u.includes('thelancet.com')) return 'lancet'
    if (u.includes('jamanetwork.com')) return 'jama'
    if (u.includes('bmj.com')) return 'bmj'
    if (u.includes('springer.com') || u.includes('springerlink.com') || u.includes('link.springer.com')) return 'springer'
    if (u.includes('wiley.com') || u.includes('onlinelibrary.wiley.com')) return 'wiley'
    if (u.includes('sciencedirect.com') || u.includes('elsevier.com')) return 'elsevier'
    if (u.includes('tandfonline.com')) return 'tandfonline'
    if (u.includes('academic.oup.com') || u.includes('oxfordacademic.com')) return 'oxford'
    if (u.includes('cambridge.org')) return 'cambridge'
    if (u.includes('acs.org') || u.includes('pubs.acs.org')) return 'acs'
    if (u.includes('rsc.org') || u.includes('pubs.rsc.org')) return 'rsc'
    if (u.includes('aps.org') || u.includes('journals.aps.org')) return 'aps'
    if (u.includes('iop.org') || u.includes('iopscience.iop.org')) return 'iop'
    if (u.includes('ieee.org') || u.includes('ieeexplore.ieee.org')) return 'ieee'
    if (u.includes('dl.acm.org') || u.includes('acm.org')) return 'acm'
    if (u.includes('frontiersin.org')) return 'frontiers'
    if (u.includes('mdpi.com')) return 'mdpi'
    if (u.includes('hindawi.com')) return 'hindawi'
    if (u.includes('karger.com')) return 'karger'
    if (u.includes('sagepub.com')) return 'sage'
    if (u.includes('liebertpub.com')) return 'liebert'
    if (u.includes('cochranelibrary.com')) return 'cochrane'
    if (u.includes('ahajournals.org')) return 'aha'
    if (u.includes('asnjournals.org') || u.includes('jasn.asnjournals.org')) return 'asn'
    if (u.includes('rupress.org')) return 'rockefeller'
    if (u.includes('genetics.org') || u.includes('genetics.gsapjournals.org')) return 'genetics'
    if (u.includes('jneurosci.org')) return 'jneurosci'
    if (u.includes('pnas.org')) return 'pnas'
    if (u.includes('science.sciencemag.org')) return 'science'
    if (u.includes('embopress.org')) return 'embo'
    if (u.includes('molbiolcell.org')) return 'mbc'
    if (u.includes('annualreviews.org')) return 'annualreviews'
    if (u.includes('biochemj.org') || u.includes('portlandpress.com')) return 'biochemj'
    if (u.includes('physiology.org')) return 'physiology'
    if (u.includes('microbiologyresearch.org')) return 'microbiology'
    if (u.includes('jbc.org')) return 'jbc'
    if (u.includes('jimmunol.org')) return 'jimmunol'
    if (u.includes('bloodjournal.org')) return 'blood'
    if (u.includes('haematologica.org')) return 'haematologica'
    if (u.includes('diabetesjournals.org')) return 'diabetes'
    if (u.includes('thoracic.org') || u.includes('atsjournals.org')) return 'ats'
    if (u.includes('ersjournals.com')) return 'ers'
    if (u.includes('gut.bmj.com')) return 'gut'
    if (u.includes('jci.org')) return 'jci'
    if (u.includes('moodbiologypsychiatry.org') || u.includes('biologicalpsychiatryjournal.com')) return 'biolpsych'
    if (u.includes('brainjournal.org') || u.includes('brain.oxfordjournals.org')) return 'brain'
    if (u.includes('pubs.rsna.org') || u.includes('radiology.rsna.org')) return 'radiology'
    // ── Aggregators & repositories ─────────────────────────────────────────
    if (u.includes('semanticscholar.org')) return 'semanticscholar'
    if (u.includes('researchgate.net')) return 'researchgate'
    if (u.includes('jstor.org')) return 'jstor'
    if (u.includes('scholar.google.com')) return 'googlescholar'
    if (u.includes('europepmc.org')) return 'europepmc'
    if (u.includes('core.ac.uk')) return 'core'
    if (u.includes('zenodo.org')) return 'zenodo'
    if (u.includes('figshare.com')) return 'figshare'
    if (u.includes('hal.science') || u.includes('hal.archives-ouvertes.fr')) return 'hal'
    if (u.includes('scielo.org') || u.includes('scielo.br') || u.includes('scielo.cl')) return 'scielo'
    if (u.includes('ingentaconnect.com')) return 'ingenta'
    if (u.includes('worldscientific.com')) return 'worldscientific'
    if (u.includes('degruyter.com')) return 'degruyter'
    if (u.includes('sciendo.com')) return 'sciendo'
    if (u.includes('futuremedicine.com') || u.includes('future-science.com')) return 'futuremedicine'
    if (u.includes('thieme-connect.com') || u.includes('thieme.de')) return 'thieme'
    if (u.includes('ovid.com')) return 'ovid'
    if (u.includes('proquest.com')) return 'proquest'
    if (u.includes('ebscohost.com')) return 'ebsco'
    // ── Heuristic: citation meta tags (Google Scholar / Highwire Press) ──────
    if (document.querySelector('meta[name="citation_title"]')) return 'generic'
    if (document.querySelector('meta[name="citation_doi"]')) return 'generic'
    if (document.querySelector('meta[name="dc.title"]') || document.querySelector('meta[name="DC.title"]')) return 'generic'
    // Check schema.org JSON-LD for ScholarlyArticle / Article types
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const s of ldScripts) {
      try {
        const data = JSON.parse(s.textContent || '')
        const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
        if (types.some((t) => typeof t === 'string' && (t.includes('Article') || t.includes('ScholarlyArticle') || t.includes('Publication')))) return 'generic'
        if (Array.isArray(data['@graph'])) {
          for (const node of data['@graph']) {
            const nt = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
            if (nt.some((t) => typeof t === 'string' && (t.includes('Article') || t.includes('ScholarlyArticle')))) return 'generic'
          }
        }
      } catch (_) {}
    }
    // DOI link on the page is a strong signal
    if (document.querySelector('a[href*="doi.org/10."], [content*="10."][property*="identifier"]')) return 'generic'
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
        // Try detecting now — detectPaper() runs the full heuristic chain
        detectPaper()
        sendResponse({ found: !!lastPaperData, data: lastPaperData })
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
