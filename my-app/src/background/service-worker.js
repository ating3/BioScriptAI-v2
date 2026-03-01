// Bioscript Background Service Worker (MV3)

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: true })
  chrome.contextMenus.create({
    id: 'bioscript-define',
    title: 'Define with Bioscript',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({
    id: 'bioscript-save',
    title: 'Save to Bioscript Vault',
    contexts: ['page'],
  })
})

// Open side panel on action click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})

// ─── Active-tab tracking ───────────────────────────────────────────────────
// Whenever the user switches to a different tab or a tab finishes loading,
// scrape its DOM and push PAPER_DATA_PUSH to the sidepanel so it updates
// regardless of whether the paper was opened in the same tab or a new one.

function pushPaperDataForTab(tabId, tabUrl) {
  if (!tabId || !tabUrl) return
  // Only run on pages that could contain a paper
  const knownHosts = [
    'pubmed', 'ncbi.nlm.nih.gov',
    'arxiv.org', 'nature.com', 'science.org',
    'cell.com', 'biorxiv.org', 'medrxiv.org',
    'plos.org', 'elifesciences.org',
  ]
  const mightBePaper = knownHosts.some((h) => tabUrl.includes(h))

  if (!mightBePaper) {
    // Not a paper host — tell the sidepanel to clear
    chrome.runtime.sendMessage({ type: 'PAPER_DATA_PUSH', found: false }).catch(() => {})
    return
  }

  chrome.scripting.executeScript(
    { target: { tabId }, func: extractPaperFromPage },
    (results) => {
      if (chrome.runtime.lastError || !results?.[0]?.result) {
        chrome.runtime.sendMessage({ type: 'PAPER_DATA_PUSH', found: false }).catch(() => {})
      } else {
        chrome.runtime.sendMessage({
          type: 'PAPER_DATA_PUSH',
          found: true,
          data: results[0].result,
        }).catch(() => {})
      }
    }
  )
}

// User switches to a different tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return
    pushPaperDataForTab(tab.id, tab.url)
  })
})

// Tab finishes loading (covers new tabs, navigation, and refreshes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  // Only act if this tab is currently active
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return
    if (tabs[0]?.id === tabId) {
      pushPaperDataForTab(tabId, tab.url)
    }
  })
})

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'bioscript-define') {
    chrome.tabs.sendMessage(tab.id, {
      type: 'DEFINE_SELECTION',
      text: info.selectionText,
    })
  }
  if (info.menuItemId === 'bioscript-save') {
    chrome.tabs.sendMessage(tab.id, { type: 'SAVE_PAPER' })
  }
})

// Message passing hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ url: tabs[0]?.url || '' })
    })
    return true
  }

  // Sidepanel asking: "what paper is the active tab on right now?"
  // Uses scripting.executeScript to read the DOM directly — no race conditions.
  if (message.type === 'REQUEST_PAPER_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id || !tab?.url) { sendResponse({ found: false }); return }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: extractPaperFromPage,
        },
        (results) => {
          if (chrome.runtime.lastError || !results?.[0]?.result) {
            sendResponse({ found: false })
          } else {
            sendResponse({ found: true, data: results[0].result })
          }
        }
      )
    })
    return true
  }

  if (message.type === 'CALL_LLM') {
    handleLLMRequest(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'FETCH_PAPER_METADATA') {
    fetchPaperMetadata(message.url)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'CAPTURE_VIEWPORT_FIGURES') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) { sendResponse({ success: false, error: 'No active tab' }); return }

      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, func: captureViewportFigures },
        (results) => {
          if (chrome.runtime.lastError || !results?.[0]) {
            sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Script failed' })
          } else {
            sendResponse({ success: true, figures: results[0].result || [] })
          }
        }
      )
    })
    return true
  }

  if (message.type === 'PAPER_DETECTED') {
    // Broadcast to side panel
    chrome.runtime.sendMessage({ type: 'PAPER_DETECTED', data: message.data }).catch(() => {})
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'VIEWPORT_UPDATE') {
    chrome.runtime.sendMessage({ type: 'VIEWPORT_UPDATE', data: message.data }).catch(() => {})
    sendResponse({ success: true })
    return true
  }

  // Define word in context of paper: get paper from tab, call LLM, add user + assistant messages to chat
  if (message.type === 'DEFINE_WORD') {
    const { data } = message
    const tabId = sender.tab?.id
    const pageUrl = data?.url || sender.tab?.url || ''
    if (!data?.word || !tabId) {
      sendResponse({ success: false, error: 'Missing word or tab' })
      return true
    }
    const term = String(data.word).trim()
    if (!term) {
      sendResponse({ success: false, error: 'Empty term' })
      return true
    }
    let responded = false
    function reply(ok, errMsg) {
      if (responded) return
      responded = true
      try {
        sendResponse(ok ? { success: true } : { success: false, error: errMsg || 'Failed' })
      } catch (_) {}
    }
    handleDefineWord(tabId, term, data.context || '', pageUrl)
      .then(() => reply(true))
      .catch((err) => reply(false, err && err.message ? err.message : String(err)))
    return true
  }
})

// ─── Injected into page to capture in-viewport figures ────────────────────
// Must be self-contained. Runs with the page's origin so cross-origin fetches work.
async function captureViewportFigures() {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Collect candidate elements: standalone <img> and <figure> wrappers
  const figures = []

  // Helper: is element meaningfully visible in the viewport?
  function inViewport(el) {
    const r = el.getBoundingClientRect()
    return r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0 && r.width > 60 && r.height > 60
  }

  // Helper: fetch an image src and return base64 data URL via canvas
  async function toBase64(src) {
    try {
      // Absolute-ify relative URLs
      const url = src.startsWith('//') ? 'https:' + src
        : src.startsWith('/') ? window.location.origin + src
        : src

      // Try fetch first (works for same-origin and many CDNs)
      let blob
      try {
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) throw new Error('fetch failed')
        blob = await res.blob()
      } catch {
        // Fallback: draw directly with crossOrigin=anonymous
        return await drawImgToCanvas(url)
      }

      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  function drawImgToCanvas(url) {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          canvas.getContext('2d').drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  // Gather figure containers first (they carry captions)
  const seen = new Set()
  const figureEls = Array.from(document.querySelectorAll('figure, [class*="figure"], [class*="fig-"]'))
  for (const fig of figureEls) {
    if (!inViewport(fig)) continue
    const img = fig.querySelector('img')
    if (!img || !img.src || seen.has(img.src)) continue
    seen.add(img.src)
    const caption =
      fig.querySelector('figcaption, [class*="caption"], [class*="fig-caption"]')?.textContent?.trim() || ''
    figures.push({ src: img.src, caption, alt: img.alt || '' })
  }

  // Then pick up any bare <img> not already captured
  const allImgs = Array.from(document.querySelectorAll('img'))
  for (const img of allImgs) {
    if (!img.src || seen.has(img.src)) continue
    if (!inViewport(img)) continue
    // Skip tiny icons/logos
    if (img.naturalWidth < 80 || img.naturalHeight < 80) continue
    seen.add(img.src)
    // Look up for a nearby caption
    const parent = img.closest('figure, [class*="figure"]')
    const caption = parent
      ? parent.querySelector('figcaption, [class*="caption"]')?.textContent?.trim() || ''
      : img.title || ''
    figures.push({ src: img.src, caption, alt: img.alt || '' })
  }

  // Convert up to 6 figures to base64
  const results = []
  for (const fig of figures.slice(0, 6)) {
    const base64 = await toBase64(fig.src)
    if (base64) {
      results.push({ base64, caption: fig.caption, alt: fig.alt, src: fig.src })
    }
  }

  return results
}

// This function is serialised and injected into the page by scripting.executeScript.
// It must be self-contained — no closures over external variables.
function extractPaperFromPage() {
  const url = window.location.href

  function detectSource(u) {
    if (u.includes('pubmed.ncbi') || u.includes('ncbi.nlm.nih.gov/pmc') || u.includes('pmc.ncbi.nlm.nih.gov')) return 'pubmed'
    if (u.includes('arxiv.org')) return 'arxiv'
    if (u.includes('nature.com')) return 'nature'
    if (u.includes('science.org')) return 'science'
    if (u.includes('cell.com')) return 'cell'
    if (u.includes('biorxiv.org')) return 'biorxiv'
    if (u.includes('medrxiv.org')) return 'medrxiv'
    if (u.includes('plos.org')) return 'plos'
    if (u.includes('elifesciences.org')) return 'elife'
    return null
  }

  const source = detectSource(url)
  if (!source) return null

  const title =
    document.querySelector('h1.title, h1[class*="title"], .article-title, #page-title')?.textContent?.trim() ||
    document.querySelector('meta[name="citation_title"]')?.content ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title

  const authorEls = document.querySelectorAll(
    '.authors a, .author-name, [class*="author"] a, meta[name="citation_author"]'
  )
  const authors = Array.from(authorEls)
    .map((el) => el.content || el.textContent.trim())
    .filter(Boolean)
    .slice(0, 10)

  const abstract =
    document.querySelector('#abstract, .abstract, [class*="abstract"] p, [id*="abstract"] p')?.textContent?.trim() ||
    document.querySelector('meta[name="description"]')?.content ||
    ''

  const doi =
    document.querySelector('meta[name="citation_doi"]')?.content ||
    document.querySelector('a[href*="doi.org"]')?.href?.replace('https://doi.org/', '') ||
    ''

  const journal =
    document.querySelector('meta[name="citation_journal_title"]')?.content ||
    document.querySelector('[class*="journal-title"]')?.textContent?.trim() ||
    ''

  const year =
    document.querySelector('meta[name="citation_publication_date"]')?.content?.slice(0, 4) ||
    document.querySelector('meta[name="citation_date"]')?.content?.slice(0, 4) ||
    ''

  // Stable ID from URL
  const id = btoa(unescape(encodeURIComponent(url))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)

  return { id, title, authors, abstract, doi, journal, year, url, source }
}

async function handleLLMRequest(payload) {
  const { apiKey, model, messages, systemPrompt } = payload
  if (!apiKey) throw new Error('No API key configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are Bioscript, an expert academic research assistant.' },
        ...messages,
      ],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'LLM request failed')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function handleDefineWord(tabId, term, viewportContext, pageUrl) {
  const [paperResult, storage] = await Promise.all([
    new Promise((resolve) => {
      chrome.scripting.executeScript(
        { target: { tabId }, func: extractPaperFromPage },
        (results) => {
          if (chrome.runtime.lastError || !results?.[0]?.result) resolve(null)
          else resolve(results[0].result)
        }
      )
    }),
    new Promise((resolve) => {
      chrome.storage.local.get(['apiKey', 'chatMessages', 'deepResearch'], resolve)
    }),
  ])

  const apiKey = storage.apiKey
  if (!apiKey) throw new Error('No API key configured. Add your OpenAI key in Bioscript Settings.')

  const paper = paperResult
  const paperContext = paper
    ? `Paper: "${paper.title}" by ${(paper.authors || []).slice(0, 3).join(', ')}. Abstract: ${(paper.abstract || '').slice(0, 600)}.`
    : 'No paper metadata available.'
  const contextSnippet = viewportContext ? `Visible context: ${viewportContext.slice(0, 400)}.` : ''

  const systemPrompt = `You are Bioscript, an expert academic research assistant. Define the given term concisely in the context of this paper. Be precise and brief (2–4 sentences).`
  const userMsg = `${paperContext} ${contextSnippet}\n\nDefine: "${term}"`

  const definition = await handleLLMRequest({
    apiKey,
    model: storage.deepResearch ? 'gpt-4o' : 'gpt-4o-mini',
    systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })

  const paperId = paper?.id || btoa(unescape(encodeURIComponent(pageUrl || 'unknown'))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
  const chatMessages = storage.chatMessages || {}
  const list = chatMessages[paperId] || []
  const ts = Date.now()
  list.push({ role: 'user', content: `define "${term}"`, timestamp: ts })
  list.push({ role: 'assistant', content: definition, timestamp: ts + 1 })
  chatMessages[paperId] = list
  await new Promise((resolve) => chrome.storage.local.set({ chatMessages }, resolve))
  chrome.runtime.sendMessage({ type: 'CHAT_MESSAGES_UPDATED', paperId, chatMessages: list }).catch(() => {})
}

async function fetchPaperMetadata(url) {
  // ArXiv API
  if (url.includes('arxiv.org')) {
    const arxivId = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9.]+)/)?.[1]
    if (arxivId) {
      const res = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`)
      const text = await res.text()
      const parser = new DOMParser()
      const xml = parser.parseFromString(text, 'text/xml')
      const entry = xml.querySelector('entry')
      if (entry) {
        return {
          title: entry.querySelector('title')?.textContent?.trim(),
          authors: Array.from(entry.querySelectorAll('author name')).map((n) => n.textContent),
          abstract: entry.querySelector('summary')?.textContent?.trim(),
          url,
          source: 'arxiv',
          year: entry.querySelector('published')?.textContent?.slice(0, 4),
        }
      }
    }
  }

  // PubMed — use NCBI E-utilities
  if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
    const pmid = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1]
    if (pmid) {
      const res = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`
      )
      const data = await res.json()
      const result = data.result?.[pmid]
      if (result) {
        return {
          title: result.title,
          authors: result.authors?.map((a) => a.name) || [],
          journal: result.fulljournalname,
          year: result.pubdate?.slice(0, 4),
          doi: result.elocationid?.replace('doi: ', ''),
          url,
          source: 'pubmed',
        }
      }
    }
  }

  return { url, source: 'unknown' }
}
