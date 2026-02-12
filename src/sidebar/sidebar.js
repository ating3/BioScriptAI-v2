/**
 * Sidebar UI Logic
 * Based on SIDEBAR_UI_SPEC.json
 */

// State
let currentContext = null;
let conversationHistory = [];
let currentTab = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeSidebar();
  setupEventListeners();
  loadWorkspace();
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
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-clear-context').addEventListener('click', () => {
    clearContext();
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
 * Check current tab and load context
 */
async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab.url) {
    updateContextState('detecting');
    
    // Request visible context from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getVisibleContext' }, (response) => {
      if (response && response.text) {
        updateContextState('ready', {
          title: extractTitleFromUrl(tab.url),
          source: tab.url
        });
        currentContext = response;
      } else {
        updateContextState('idle');
      }
    });
  }
}

/**
 * Update context bar state
 */
function updateContextState(state, data = {}) {
  // Hide all states
  document.querySelectorAll('.context-state').forEach(el => {
    el.classList.add('hidden');
  });

  // Show appropriate state
  const stateEl = document.getElementById(`context-state-${state}`);
  if (stateEl) {
    stateEl.classList.remove('hidden');
  }

  if (state === 'ready' && data.title) {
    document.getElementById('context-title').textContent = data.title;
    if (data.source) {
      document.getElementById('context-source').textContent = new URL(data.source).hostname;
    }
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

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

/**
 * Load workspace data
 */
async function loadWorkspace() {
  // Load projects from Zotero or local storage
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'zotero',
      operation: 'listCollections'
    });

    if (response.success) {
      renderProjects(response.collections);
    }
  } catch (error) {
    console.error('Failed to load workspace:', error);
  }
}

/**
 * Render projects list
 */
function renderProjects(collections) {
  const list = document.getElementById('projects-list');
  list.innerHTML = '';

  if (collections.length === 0) {
    list.innerHTML = '<div class="empty-state">No projects. Create one to group papers.</div>';
    return;
  }

  collections.forEach(collection => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.innerHTML = `
      <div class="project-name">${collection.data.name}</div>
      <div class="project-count">${collection.meta.numItems || 0} papers</div>
      <div class="project-actions">
        <button class="icon-btn" onclick="openProject('${collection.key}')">Open</button>
        <button class="icon-btn" onclick="exportProject('${collection.key}')">Export</button>
      </div>
    `;
    list.appendChild(item);
  });
}

/**
 * Create project
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
      action: 'zotero',
      operation: 'createCollection',
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
window.openProject = function(collectionKey) {
  // TODO: Implement project detail view
  console.log('Open project:', collectionKey);
};

window.exportProject = function(collectionKey) {
  openModal('modal-export');
  // TODO: Load export data
};
