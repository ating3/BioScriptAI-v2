/**
 * Options Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

/**
 * Load current settings
 */
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    document.getElementById('screen-inference-enabled').checked = 
      settings.screenInferenceEnabled !== false;
    document.getElementById('cloud-acceleration-enabled').checked = 
      settings.cloudAccelerationEnabled === true;
    document.getElementById('llm-base-url').value = 
      settings.llmBaseUrl || 'http://localhost:8000';
    document.getElementById('zotero-api-key').value = 
      settings.zoteroApiKey || '';
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('test-llm-connection').addEventListener('click', testLLMConnection);
  document.getElementById('test-zotero-connection').addEventListener('click', testZoteroConnection);
}

/**
 * Save settings
 */
async function saveSettings() {
  const settings = {
    screenInferenceEnabled: document.getElementById('screen-inference-enabled').checked,
    cloudAccelerationEnabled: document.getElementById('cloud-acceleration-enabled').checked,
    llmBaseUrl: document.getElementById('llm-base-url').value,
    zoteroApiKey: document.getElementById('zotero-api-key').value
  };

  await chrome.storage.local.set({ settings });

  const statusEl = document.getElementById('save-status');
  statusEl.textContent = 'Settings saved!';
  statusEl.className = 'status success';
  
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

/**
 * Test LLM connection
 */
async function testLLMConnection() {
  const baseUrl = document.getElementById('llm-base-url').value;
  const statusEl = document.getElementById('llm-status');
  
  statusEl.textContent = 'Testing...';
  statusEl.className = 'status';

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      statusEl.textContent = '✓ Connection successful!';
      statusEl.className = 'status success';
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    statusEl.textContent = `✗ Connection failed: ${error.message}`;
    statusEl.className = 'status error';
  }
}

/**
 * Test Zotero connection
 */
async function testZoteroConnection() {
  const apiKey = document.getElementById('zotero-api-key').value;
  const statusEl = document.getElementById('zotero-status');
  
  if (!apiKey) {
    statusEl.textContent = 'Please enter an API key';
    statusEl.className = 'status error';
    return;
  }

  statusEl.textContent = 'Testing...';
  statusEl.className = 'status';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'zotero',
      operation: 'initialize',
      params: { apiKey }
    });

    if (response.success) {
      statusEl.textContent = '✓ Zotero connection successful!';
      statusEl.className = 'status success';
    } else {
      throw new Error('Invalid API key');
    }
  } catch (error) {
    statusEl.textContent = `✗ Connection failed: ${error.message}`;
    statusEl.className = 'status error';
  }
}
