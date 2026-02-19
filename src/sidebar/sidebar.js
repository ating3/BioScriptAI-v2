/**
 * Sidebar UI Logic
 * Based on SIDEBAR_UI_SPEC.json
 */

// State
let currentContext = null;
let conversationHistory = [];
let currentTab = null;

// State for project table (for search + export)
let currentProjectPapers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeSidebar();
  setupEventListeners();
  setupContextUpdateListener();
  loadWorkspace();
  hideLoadingOverlay();
  checkCurrentTab();
});

/**
 * Initialize sidebar
 */
function initializeSidebar() {
  // Check if screen inference is enabled
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    if (settings.screenInferenceEnabled !== false) {
      showScreenInferenceConsent();
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Header actions
  document.getElementById('btn-refresh-context').addEventListener('click', () => {
    checkCurrentTab();
  });

  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-clear-context').addEventListener('click', () => {
    clearContext();
  });

  document.getElementById('btn-retry-context').addEventListener('click', () => {
    checkCurrentTab();
  });

  // Workspace tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  // Create project
  document.getElementById('btn-create-project').addEventListener('click', () => {
    openModal('modal-create-project');
  });

  document.getElementById('btn-create-project-submit').addEventListener('click', () => {
    createProject();
  });

  document.getElementById('btn-save-to-project').addEventListener('click', () => {
    openSaveToProjectModal();
  });

  // Database selection (idle state)
  document.querySelectorAll('.database-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      if (url) chrome.tabs.create({ url });
    });
  });

  const databaseTopicInput = document.getElementById('database-topic-input');
  const databaseTopicSearch = document.getElementById('database-topic-search');
  if (databaseTopicInput && databaseTopicSearch) {
    databaseTopicSearch.addEventListener('click', () => searchDatabaseByTopic());
    databaseTopicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchDatabaseByTopic();
    });
  }

  // Project table: back, Generate Works Cited / Annotated Bib, search
  const projectTableBack = document.getElementById('project-table-back');
  if (projectTableBack) projectTableBack.addEventListener('click', () => closeModal('modal-project-table'));
  document.getElementById('btn-generate-works-cited')?.addEventListener('click', generateWorksCited);
  document.getElementById('btn-generate-annotated-bib')?.addEventListener('click', generateAnnotatedBib);
  document.getElementById('project-table-search')?.addEventListener('input', filterProjectTableRows);

  // Save to project: search filter
  document.getElementById('save-to-project-search')?.addEventListener('input', filterSaveToProjectList);

  // Question input
  const questionInput = document.getElementById('question-input');
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  });

  document.getElementById('btn-send-question').addEventListener('click', sendQuestion);

  // Quick actions
  document.querySelectorAll('.quick-action-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      questionInput.value = text;
      sendQuestion();
    });
  });
}

/**
 * Listen for context updates from background (e.g. on scroll)
 */
function setupContextUpdateListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'contextUpdated' && message.context) {
      currentContext = message.context;
      showContextUpdatedIndicator();
    }
  });
}

/**
 * Show brief "Context updated" indicator in the context bar
 */
function showContextUpdatedIndicator() {
  const readyEl = document.getElementById('context-state-ready');
  if (!readyEl || !readyEl.classList.contains('context-state')) return;
  const existing = document.getElementById('context-updated-badge');
  if (existing) existing.remove();
  const badge = document.createElement('span');
  badge.id = 'context-updated-badge';
  badge.className = 'context-updated-badge';
  badge.textContent = 'Context updated';
  badge.setAttribute('aria-live', 'polite');
  readyEl.appendChild(badge);
  setTimeout(() => {
    if (badge.parentNode) badge.remove();
  }, 2500);
}

/**
 * Check current tab and load context
 */
async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.id || !tab.url) {
    hideLoadingOverlay();
    updateContextState('idle');
    return;
  }

  // Chrome's built-in PDF viewer runs in a chrome-extension:// page; content scripts cannot run there
  if (tab.url.startsWith('chrome-extension://')) {
        hideLoadingOverlay();
        updateContextState('error', { message: 'This tab is the PDF viewer. Open the paper as a web article (e.g. journal HTML page) or use a site that shows the article in HTML.' });
    return;
  }

  updateContextState('loading');
  showLoadingOverlay();

  function onContextResult(response) {
    hideLoadingOverlay();
    if (response && response.text) {
      const title = extractTitleFromUrl(tab.url);
      updateContextState('ready', {
        title,
        source: tab.url
      });
      currentContext = response;
      // Sync to background so QA and scroll buffer use this context
      chrome.runtime.sendMessage({
        action: 'setPageContext',
        context: response,
        title,
        url: tab.url
      });
    } else {
      const reason = response?.source === 'unsupported' || response?.source === 'no_content' || response?.source === 'pdf_no_text'
        ? 'No readable content found. Try a journal article page or a page with visible text.'
        : 'Could not load context.';
      updateContextState('error', { message: reason });
    }
  }

  function tryGetContext(useInjectionFallback) {
    chrome.tabs.sendMessage(tab.id, { action: 'getVisibleContext' }, (response) => {
      if (chrome.runtime.lastError) {
        const err = chrome.runtime.lastError.message || '';
        const canInject = (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://') || tab.url.startsWith('file://')));
        if (useInjectionFallback && canInject && (err.includes('Receiving end does not exist') || err.includes('Could not establish connection'))) {
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ['src/content/content-script.js'] },
            () => {
              if (chrome.runtime.lastError) {
                hideLoadingOverlay();
                updateContextState('error', { message: 'Could not read this page. Try refreshing the tab, then open the sidebar again.' });
                return;
              }
              // Give the injected script a moment to register its listener
              setTimeout(() => tryGetContext(false), 250);
            }
          );
          return;
        }
        const hint = err.includes('Receiving end does not exist') || err.includes('Could not establish connection')
          ? ' Try refreshing the paper tab, then open the sidebar again.'
          : '';
        hideLoadingOverlay();
        updateContextState('error', { message: 'Extension could not read this page.' + hint });
        return;
      }
      onContextResult(response);
    });
  }

  tryGetContext(true);
}

/**
 * Show/hide loading overlay
 */
function hideLoadingOverlay() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
}

function showLoadingOverlay() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.remove('hidden');
}

/**
 * Update context bar state
 */
function updateContextState(state, data = {}) {
  document.querySelectorAll('.context-state').forEach(el => el.classList.add('hidden'));
  const stateEl = document.getElementById(`context-state-${state}`);
  if (stateEl) stateEl.classList.remove('hidden');

  const ctaSection = document.getElementById('paper-view-cta-section');
  if (ctaSection) {
    if (state === 'ready') ctaSection.classList.remove('hidden');
    else ctaSection.classList.add('hidden');
  }

  if (state === 'ready' && data.title) {
    document.getElementById('context-title').textContent = data.title;
    if (data.source) {
      document.getElementById('context-source').textContent = new URL(data.source).hostname;
    }
  }
  if (state === 'error' && data.message) {
    const el = document.getElementById('context-error-message');
    if (el) el.textContent = data.message;
  }
}

/**
 * Send question to QA module
 */
async function sendQuestion() {
  const questionInput = document.getElementById('question-input');
  const question = questionInput.value.trim();
  
  if (!question) return;
  if (!currentContext) {
    alert('No paper context available. Please open a paper or article.');
    return;
  }

  // Add user message to thread
  addMessageToThread('user', question);
  questionInput.value = '';

  // Show loading
  const loadingMsg = addMessageToThread('assistant', 'Thinking...');
  loadingMsg.classList.add('loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'answerQuestion',
      question,
      conversationHistory
    });

    if (response.success) {
      loadingMsg.textContent = response.answer;
      loadingMsg.classList.remove('loading');
      
      // Update conversation history
      conversationHistory.push({
        user: question,
        assistant: response.answer
      });
    } else {
      loadingMsg.textContent = `Error: ${response.error}`;
      loadingMsg.classList.remove('loading');
    }
  } catch (error) {
    loadingMsg.textContent = `Error: ${error.message}`;
    loadingMsg.classList.remove('loading');
  }
}

/**
 * Add message to response thread
 */
function addMessageToThread(role, content) {
  const thread = document.getElementById('response-thread');
  
  // Remove empty state if present
  const emptyState = thread.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const message = document.createElement('div');
  message.className = `message-bubble message-${role}`;
  message.textContent = content;
  thread.appendChild(message);
  
  // Scroll to bottom
  thread.scrollTop = thread.scrollHeight;
  
  return message;
}

/**
 * Switch workspace tab
 */
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
  const tabContent = document.getElementById(`tab-${tabName}`);
  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');
}

/**
 * Load workspace data (local projects)
 */
async function loadWorkspace() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'projects',
      operation: 'listProjects'
    });

    if (response.success) {
      renderProjects(response.projects);
    }
  } catch (error) {
    console.error('Failed to load workspace:', error);
  }
}

/**
 * Render projects list (local)
 */
function renderProjects(projects) {
  const list = document.getElementById('projects-list');
  list.innerHTML = '';

  if (!projects || projects.length === 0) {
    list.innerHTML = '<div class="empty-state">No projects. Create one, then save papers from the context bar.</div>';
    return;
  }

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'project-item';
    const count = project.paperCount || 0;
    item.innerHTML = `
      <div class="project-name">${escapeHtml(project.name)}</div>
      <div class="project-count">${count} paper${count !== 1 ? 's' : ''}</div>
      <div class="project-actions">
        <button class="icon-btn" data-open-project="${escapeHtml(project.id)}">Open</button>
        <button class="icon-btn icon-btn-danger" data-delete-project="${escapeHtml(project.id)}" title="Delete project">🗑</button>
      </div>
    `;
    list.appendChild(item);
    item.querySelector('[data-open-project]').addEventListener('click', () => openProject(project.id));
    item.querySelector('[data-delete-project]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${project.name}"? Papers are kept in storage but removed from this project.`)) {
        deleteProject(project.id);
      }
    });
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Create project (local)
 */
async function createProject() {
  const nameInput = document.getElementById('project-name-input');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Please enter a project name');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'projects',
      operation: 'createProject',
      params: { name }
    });

    if (response.success) {
      closeModal('modal-create-project');
      nameInput.value = '';
      loadWorkspace();
    } else {
      alert(`Failed to create project: ${response.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Open project table modal (papers + AI summary + citation)
 */
async function openProject(projectId) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'projects',
      operation: 'getProjectPapers',
      params: { projectId }
    });

    if (!response.success) {
      alert(response.error || 'Could not load project.');
      return;
    }

    const projects = (await chrome.runtime.sendMessage({ action: 'projects', operation: 'listProjects' })).projects || [];
    const project = projects.find(p => p.id === projectId);
    const projectName = project ? project.name : 'Project';

    document.getElementById('project-table-title').textContent = projectName;
    const tbody = document.getElementById('project-table-body');
    tbody.innerHTML = '';

    currentProjectPapers = response.papers || [];
    if (currentProjectPapers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No papers in this project. Save papers from the context bar.</td></tr>';
    } else {
      currentProjectPapers.forEach(paper => {
        const tr = document.createElement('tr');
        const summaryHtml = formatSummaryForTable(paper.summary);
        const citation = paper.citation || `${paper.title}. ${paper.url}`;
        const searchText = [paper.title, citation, flattenSummary(paper.summary)].filter(Boolean).join(' ').toLowerCase();
        tr.dataset.search = searchText;
        tr.innerHTML = `
          <td>
            <a class="paper-link" href="${escapeHtml(paper.url)}" target="_blank" rel="noopener">${escapeHtml(paper.title)}</a>
          </td>
          <td class="summary-cell">${summaryHtml}</td>
          <td class="citation-cell">
            <span class="citation-text">${escapeHtml(citation)}</span>
            <div class="citation-actions">
              <button type="button" class="btn-copy-citation">Copy</button>
            </div>
          </td>
        `;
        tr.querySelector('.btn-copy-citation').addEventListener('click', () => {
          navigator.clipboard.writeText(citation);
          const btn = tr.querySelector('.btn-copy-citation');
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = orig; }, 1500);
        });
        tbody.appendChild(tr);
      });
    }

    document.getElementById('project-table-search').value = '';
    openModal('modal-project-table');
  } catch (error) {
    console.error('Open project error:', error);
    alert(`Error: ${error.message}`);
  }
}

function flattenSummary(summary) {
  if (!summary || typeof summary !== 'object') return '';
  const parts = [];
  for (const key of ['objective', 'methodology', 'results', 'limitations']) {
    if (Array.isArray(summary[key])) parts.push(...summary[key]);
  }
  return parts.join(' ');
}

function formatSummaryForTable(summary) {
  if (!summary || typeof summary !== 'object') {
    return '<span class="summary-missing">No summary</span>';
  }
  const sections = [
    { key: 'objective', label: 'Objective' },
    { key: 'methodology', label: 'Methodology' },
    { key: 'results', label: 'Results' },
    { key: 'limitations', label: 'Limitations' }
  ];
  let html = '';
  for (const { key, label } of sections) {
    const bullets = summary[key];
    if (Array.isArray(bullets) && bullets.length > 0) {
      html += `<div class="summary-section"><strong>${label}</strong><ul>`;
      bullets.slice(0, 4).forEach(b => {
        html += `<li>${escapeHtml(b)}</li>`;
      });
      html += '</ul></div>';
    }
  }
  return html || '<span class="summary-missing">No summary</span>';
}

function filterProjectTableRows() {
  const q = (document.getElementById('project-table-search')?.value || '').trim().toLowerCase();
  document.querySelectorAll('#project-table-body tr').forEach(tr => {
    if (!tr.dataset.search) return;
    tr.style.display = !q || tr.dataset.search.includes(q) ? '' : 'none';
  });
}

function generateWorksCited() {
  const citations = currentProjectPapers
    .map(p => p.citation || `${p.title}. ${p.url}`)
    .filter(Boolean);
  if (citations.length === 0) {
    alert('No papers in this project.');
    return;
  }
  const text = citations.join('\n\n');
  navigator.clipboard.writeText(text).then(() => alert('Works Cited copied to clipboard.'));
}

function generateAnnotatedBib() {
  const entries = currentProjectPapers.map(p => {
    const cit = p.citation || `${p.title}. ${p.url}`;
    const summary = flattenSummary(p.summary);
    return summary ? `${cit}\n\n${summary}` : cit;
  });
  if (entries.length === 0) {
    alert('No papers in this project.');
    return;
  }
  const text = entries.join('\n\n---\n\n');
  navigator.clipboard.writeText(text).then(() => alert('Annotated bibliography copied to clipboard.'));
}

async function deleteProject(projectId) {
  try {
    await chrome.runtime.sendMessage({
      action: 'projects',
      operation: 'deleteProject',
      params: { projectId }
    });
    closeModal('modal-project-table');
    loadWorkspace();
  } catch (error) {
    console.error('Delete project error:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Open "Save to project" modal and list projects
 */
async function openSaveToProjectModal() {
  if (!currentContext || !currentContext.text) {
    alert('No paper context. Open a paper or article first.');
    return;
  }

  const title = document.getElementById('context-title')?.textContent || 'Current page';
  const url = currentTab?.url || '';
  if (!url || url.startsWith('chrome://')) {
    alert('Cannot save this page.');
    return;
  }

  const response = await chrome.runtime.sendMessage({
    action: 'projects',
    operation: 'listProjects'
  });

  if (!response.success) {
    alert(response.error || 'Could not load projects.');
    return;
  }

  const projects = response.projects || [];
  const listEl = document.getElementById('save-to-project-list');
  listEl.innerHTML = '';

  if (projects.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Create a project first (Workspace → Create project).</div>';
  } else {
    projects.forEach(project => {
      const item = document.createElement('div');
      item.className = 'project-pick-item';
      item.dataset.search = (project.name || '').toLowerCase();
      const count = project.paperCount || 0;
      item.innerHTML = `
        <span>${escapeHtml(project.name)}</span>
        <span class="project-paper-count">${count} paper${count !== 1 ? 's' : ''}</span>
      `;
      item.addEventListener('click', () => savePaperToProject(project.id, title, url));
      listEl.appendChild(item);
    });
  }

  document.getElementById('save-to-project-search').value = '';
  openModal('modal-save-to-project');
}

function filterSaveToProjectList() {
  const q = (document.getElementById('save-to-project-search')?.value || '').trim().toLowerCase();
  document.querySelectorAll('#save-to-project-list .project-pick-item').forEach(el => {
    el.style.display = !q || (el.dataset.search || '').includes(q) ? '' : 'none';
  });
}

/**
 * Save current paper to a project (with AI summary and citation)
 */
async function savePaperToProject(projectId, title, url) {
  const paperContext = currentContext?.text || '';
  const listEl = document.getElementById('save-to-project-list');
  listEl.innerHTML = '<div class="empty-state">Saving and generating summary…</div>';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'projects',
      operation: 'addPaperToProject',
      params: {
        projectId,
        paper: { title, url },
        paperContext: paperContext.trim() || null
      }
    });

    if (response.success) {
      closeModal('modal-save-to-project');
      loadWorkspace();
    } else {
      listEl.innerHTML = `<div class="empty-state" style="color: #c00;">${escapeHtml(response.error || 'Failed to save')}</div>`;
    }
  } catch (error) {
    listEl.innerHTML = `<div class="empty-state" style="color: #c00;">${escapeHtml(error.message)}</div>`;
  }
}

/**
 * Open/close modal
 */
function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById(modalId).classList.add('hidden');
}

/**
 * Clear context
 */
function clearContext() {
  currentContext = null;
  conversationHistory = [];
  updateContextState('idle');
  document.getElementById('response-thread').innerHTML = 
    '<div class="empty-state">Ask a question or use a quick action above.</div>';
  chrome.runtime.sendMessage({ action: 'clearPageContext' }).catch(() => {});
}

/**
 * Show screen inference consent
 */
function showScreenInferenceConsent() {
  // Check if already consented
  chrome.storage.local.get(['screenInferenceConsent'], (result) => {
    if (result.screenInferenceConsent === 'allowed') {
      return; // Already consented
    }

    // Show consent banner (simplified for now)
    const banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.innerHTML = `
      <p>BioScriptAI can use the visible part of this page to answer questions. This is done on your device by default.</p>
      <div>
        <button id="consent-allow" class="btn-primary">Allow</button>
        <button id="consent-deny" class="btn-secondary">Not now</button>
      </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('consent-allow').addEventListener('click', () => {
      chrome.storage.local.set({ screenInferenceConsent: 'allowed' });
      banner.remove();
    });

    document.getElementById('consent-deny').addEventListener('click', () => {
      chrome.storage.local.set({ screenInferenceConsent: 'disabled' });
      banner.remove();
    });
  });
}

/**
 * Open database search (PubMed) with research topic query
 */
function searchDatabaseByTopic() {
  const input = document.getElementById('database-topic-input');
  const query = (input?.value || '').trim();
  if (!query) return;
  const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
  chrome.tabs.create({ url });
}

/**
 * Extract title from URL
 */
function extractTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename.replace(/\.pdf$/i, '') || 'Current page';
  } catch {
    return 'Current page';
  }
}

// Global functions for inline handlers
// Expose for inline onclick in modals
window.closeModal = closeModal;
