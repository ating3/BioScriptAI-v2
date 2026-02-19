import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './options.css';

function OptionsApp() {
  const [settings, setSettings] = useState({
    screenInferenceEnabled: true,
    cloudAccelerationEnabled: false,
    llmBaseUrl: 'http://localhost:8000',
    zoteroApiKey: ''
  });
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [llmStatus, setLlmStatus] = useState({ type: '', message: '' });
  const [zoteroStatus, setZoteroStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    chrome.storage.local.get(['settings'], (result) => {
      const stored = result.settings || {};
      setSettings({
        screenInferenceEnabled: stored.screenInferenceEnabled !== false,
        cloudAccelerationEnabled: stored.cloudAccelerationEnabled === true,
        llmBaseUrl: stored.llmBaseUrl || 'http://localhost:8000',
        zoteroApiKey: stored.zoteroApiKey || ''
      });
    });
  };

  const saveSettings = async () => {
    await chrome.storage.local.set({ settings });
    setSaveStatus({ type: 'success', message: 'Settings saved!' });
    setTimeout(() => {
      setSaveStatus({ type: '', message: '' });
    }, 3000);
  };

  const testLLMConnection = async () => {
    setLlmStatus({ type: '', message: 'Testing...' });
    try {
      const response = await fetch(`${settings.llmBaseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        setLlmStatus({ type: 'success', message: '✓ Connection successful!' });
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setLlmStatus({ type: 'error', message: `✗ Connection failed: ${error.message}` });
    }
  };

  const testZoteroConnection = async () => {
    if (!settings.zoteroApiKey) {
      setZoteroStatus({ type: 'error', message: 'Please enter an API key' });
      return;
    }

    setZoteroStatus({ type: '', message: 'Testing...' });
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'zotero',
        operation: 'initialize',
        params: { apiKey: settings.zoteroApiKey }
      });

      if (response.success) {
        setZoteroStatus({ type: 'success', message: '✓ Zotero connection successful!' });
      } else {
        throw new Error('Invalid API key');
      }
    } catch (error) {
      setZoteroStatus({ type: 'error', message: `✗ Connection failed: ${error.message}` });
    }
  };

  return (
    <div>
      <h1>Settings</h1>

      <div className="setting-group">
        <h2>My Account</h2>
        <p className="help-text">BioScriptAI runs locally. No account is required to use the extension.</p>
      </div>

      <div className="setting-group">
        <h2>Privacy & Data</h2>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.screenInferenceEnabled}
              onChange={(e) => setSettings({ ...settings, screenInferenceEnabled: e.target.checked })}
            />
            <span>Use visible page content to answer questions (local by default)</span>
          </label>
          <div className="help-text">
            When enabled, BioScriptAI reads the visible portion of pages you visit to provide context-aware answers.
          </div>
        </div>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.cloudAccelerationEnabled}
              onChange={(e) => setSettings({ ...settings, cloudAccelerationEnabled: e.target.checked })}
            />
            <span>Cloud acceleration (faster; sends text to processing service)</span>
          </label>
          <div className="help-text">You can disable this anytime.</div>
        </div>
      </div>

      <div className="setting-group">
        <h2>Connected Apps — LLM</h2>
        <div className="setting-item">
          <label htmlFor="llm-base-url">Local LLM Server URL</label>
          <input
            type="url"
            id="llm-base-url"
            placeholder="http://localhost:8000"
            value={settings.llmBaseUrl}
            onChange={(e) => setSettings({ ...settings, llmBaseUrl: e.target.value })}
          />
          <div className="help-text">URL of your local inference server (e.g. Hugging Face model).</div>
        </div>
        <div className="setting-item">
          <button className="btn-secondary" onClick={testLLMConnection}>Test connection</button>
          {llmStatus.message && (
            <div className={`status ${llmStatus.type}`}>{llmStatus.message}</div>
          )}
        </div>
      </div>

      <div className="setting-group">
        <h2>Connected Apps — Zotero (optional)</h2>
        <p className="help-text" style={{ marginBottom: '12px' }}>
          Projects and papers are saved locally. Add a Zotero API key only if you want to sync with your Zotero library.
        </p>
        <div className="setting-item">
          <label htmlFor="zotero-api-key">Zotero API Key</label>
          <input
            type="text"
            id="zotero-api-key"
            placeholder="Leave blank to use built-in projects only"
            value={settings.zoteroApiKey}
            onChange={(e) => setSettings({ ...settings, zoteroApiKey: e.target.value })}
          />
          <div className="help-text">
            <a href="https://www.zotero.org/settings/keys/new" target="_blank" rel="noopener noreferrer">
              Get your API key
            </a>
          </div>
        </div>
        <div className="setting-item">
          <button className="btn-secondary" onClick={testZoteroConnection}>Test Zotero connection</button>
          {zoteroStatus.message && (
            <div className={`status ${zoteroStatus.type}`}>{zoteroStatus.message}</div>
          )}
        </div>
      </div>

      <div className="save-row">
        <button className="btn-primary" onClick={saveSettings}>Save settings</button>
        {saveStatus.message && (
          <div className={`status ${saveStatus.type}`}>{saveStatus.message}</div>
        )}
      </div>
    </div>
  );
}

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OptionsApp />);
} else {
  const rootEl = document.createElement('div');
  rootEl.id = 'root';
  document.body.appendChild(rootEl);
  const root = createRoot(rootEl);
  root.render(<OptionsApp />);
}
