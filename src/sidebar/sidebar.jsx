import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './sidebar.css';

// Main App Component
function SidebarApp() {
  const [currentContext, setCurrentContext] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentTab, setCurrentTab] = useState(null);
  const [contextState, setContextState] = useState('idle');
  const [contextData, setContextData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [currentProjectPapers, setCurrentProjectPapers] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [responsesExpanded, setResponsesExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');

  // Initialize
  useEffect(() => {
    initializeSidebar();
    loadWorkspace();
    hideLoadingOverlay();
    checkCurrentTab();
    
    // Listen for context updates from background
    const listener = (message) => {
      if (message.action === 'contextUpdated' && message.context) {
        setCurrentContext(message.context);
        showContextUpdatedIndicator();
      }
    };
    
    chrome.runtime.onMessage.addListener(listener);
    
    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const showContextUpdatedIndicator = () => {
    // This will be handled by the ContextBar component
  };

  const initializeSidebar = () => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      if (settings.screenInferenceEnabled !== false) {
        showScreenInferenceConsent();
      }
    });
  };

  const showScreenInferenceConsent = () => {
    chrome.storage.local.get(['screenInferenceConsent'], (result) => {
      if (result.screenInferenceConsent === 'allowed') {
        return;
      }
      // Consent banner will be handled by a component
    });
  };

  const hideLoadingOverlay = () => {
    setIsLoading(false);
  };

  const showLoadingOverlay = () => {
    setIsLoading(true);
  };

  const checkCurrentTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setCurrentTab(tab);

    if (!tab?.id || !tab.url) {
      hideLoadingOverlay();
      updateContextState('idle');
      return;
    }

    if (tab.url.startsWith('chrome-extension://')) {
      hideLoadingOverlay();
      updateContextState('error', { 
        message: 'This tab is the PDF viewer. Open the paper as a web article (e.g. journal HTML page) or use a site that shows the article in HTML.' 
      });
      return;
    }

    updateContextState('loading');
    showLoadingOverlay();

    const tryGetContext = (useInjectionFallback) => {
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
                  updateContextState('error', { 
                    message: 'Could not read this page. Try refreshing the tab, then open the sidebar again.' 
                  });
                  return;
                }
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
    };

    const onContextResult = (response) => {
      hideLoadingOverlay();
      if (response && response.text) {
        const title = extractTitleFromUrl(tab.url);
        updateContextState('ready', {
          title,
          source: tab.url
        });
        setCurrentContext(response);
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
    };

    tryGetContext(true);
  };

  const updateContextState = (state, data = {}) => {
    setContextState(state);
    setContextData(data);
  };

  const loadWorkspace = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'projects',
        operation: 'listProjects'
      });

      if (response.success) {
        setProjects(response.projects || []);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  const createProject = async (name) => {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'projects',
        operation: 'createProject',
        params: { name: name.trim() }
      });

      if (response.success) {
        setActiveModal(null);
        loadWorkspace();
      } else {
        alert(`Failed to create project: ${response.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const deleteProject = async (projectId) => {
    if (!confirm(`Delete "${projects.find(p => p.id === projectId)?.name}"? Papers are kept in storage but removed from this project.`)) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'projects',
        operation: 'deleteProject',
        params: { projectId }
      });
      setActiveModal(null);
      loadWorkspace();
    } catch (error) {
      console.error('Delete project error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const openProject = async (projectId) => {
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

      const projectsList = (await chrome.runtime.sendMessage({ 
        action: 'projects', 
        operation: 'listProjects' 
      })).projects || [];
      const project = projectsList.find(p => p.id === projectId);
      const projectName = project ? project.name : 'Project';

      setCurrentProjectPapers(response.papers || []);
      setContextData({ ...contextData, projectName, projectId });
      setActiveModal('project-table');
    } catch (error) {
      console.error('Open project error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const savePaperToProject = async (projectId) => {
    if (!currentContext || !currentContext.text) {
      alert('No paper context. Open a paper or article first.');
      return;
    }

    const title = contextData.title || 'Current page';
    const url = currentTab?.url || '';
    if (!url || url.startsWith('chrome://')) {
      alert('Cannot save this page.');
      return;
    }

    const paperContext = currentContext?.text || '';
    setContextData({ ...contextData, savingToProject: projectId });

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
        setActiveModal(null);
        loadWorkspace();
      } else {
        alert(response.error || 'Failed to save');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const sendQuestion = async (question) => {
    if (!question.trim()) return;
    if (!currentContext) {
      alert('No paper context available. Please open a paper or article.');
      return;
    }

    setConversationHistory([...conversationHistory, { role: 'user', content: question }]);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'answerQuestion',
        question,
        conversationHistory
      });

      if (response.success) {
        setConversationHistory([...conversationHistory, 
          { role: 'user', content: question },
          { role: 'assistant', content: response.answer }
        ]);
      } else {
        setConversationHistory([...conversationHistory,
          { role: 'user', content: question },
          { role: 'assistant', content: `Error: ${response.error}` }
        ]);
      }
    } catch (error) {
      setConversationHistory([...conversationHistory,
        { role: 'user', content: question },
        { role: 'assistant', content: `Error: ${error.message}` }
      ]);
    }
  };

  const clearContext = () => {
    setCurrentContext(null);
    setConversationHistory([]);
    updateContextState('idle');
    chrome.runtime.sendMessage({ action: 'clearPageContext' }).catch(() => {});
  };

  const searchDatabaseByTopic = (query) => {
    if (!query.trim()) return;
    const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url });
  };

  const extractTitleFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename.replace(/\.pdf$/i, '') || 'Current page';
    } catch {
      return 'Current page';
    }
  };

  const generateWorksCited = () => {
    const citations = currentProjectPapers
      .map(p => p.citation || `${p.title}. ${p.url}`)
      .filter(Boolean);
    if (citations.length === 0) {
      alert('No papers in this project.');
      return;
    }
    const text = citations.join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert('Works Cited copied to clipboard.'));
  };

  const generateAnnotatedBib = () => {
    const flattenSummary = (summary) => {
      if (!summary || typeof summary !== 'object') return '';
      const parts = [];
      for (const key of ['objective', 'methodology', 'results', 'limitations']) {
        if (Array.isArray(summary[key])) parts.push(...summary[key]);
      }
      return parts.join(' ');
    };

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
  };

  return (
    <div className="app-shell">
      <LoadingOverlay visible={isLoading} />
      <Header 
        onRefresh={() => checkCurrentTab()}
        onOptions={() => chrome.runtime.openOptionsPage()}
        onClear={clearContext}
      />
      <ContextBar 
        state={contextState}
        data={contextData}
        onSaveToProject={() => setActiveModal('save-to-project')}
        onRetry={() => checkCurrentTab()}
        onDatabaseSelect={(url) => chrome.tabs.create({ url })}
        onDatabaseSearch={searchDatabaseByTopic}
      />
      {contextState === 'ready' && (
        <PaperViewCTA onQuickAction={(action) => sendQuestion(action)} />
      )}
      <WorkspaceSection
        expanded={workspaceExpanded}
        onToggle={() => setWorkspaceExpanded(!workspaceExpanded)}
        projects={projects}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateProject={() => setActiveModal('create-project')}
        onOpenProject={openProject}
        onDeleteProject={deleteProject}
      />
      <QuestionSection
        onSendQuestion={sendQuestion}
        onQuickAction={(action) => sendQuestion(action)}
      />
      <ResponseSection
        expanded={responsesExpanded}
        onToggle={() => setResponsesExpanded(!responsesExpanded)}
        messages={conversationHistory}
      />
      <Modals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        onCreateProject={createProject}
        projects={projects}
        onSaveToProject={savePaperToProject}
        currentProjectPapers={currentProjectPapers}
        projectName={contextData.projectName}
        onGenerateWorksCited={generateWorksCited}
        onGenerateAnnotatedBib={generateAnnotatedBib}
      />
    </div>
  );
}

// Loading Overlay Component
function LoadingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div id="loading-overlay">
      <div className="loading-logo"></div>
      <span className="loading-app-name">Bioscript</span>
      <span className="loading-label">Loading…</span>
    </div>
  );
}

// Header Component
function Header({ onRefresh, onOptions, onClear }) {
  return (
    <header className="sidebar-header">
      <div className="sidebar-header-left">
        <div className="sidebar-logo" aria-hidden="true"></div>
        <h1>BioScriptAI</h1>
      </div>
      <div className="header-actions">
        <button className="icon-btn" onClick={onRefresh} title="Refresh context">🔄</button>
        <button className="icon-btn" onClick={onOptions} title="Settings">⚙️</button>
        <button className="icon-btn" onClick={onClear} title="Clear context">🗑️</button>
      </div>
    </header>
  );
}

// Context Bar Component
function ContextBar({ state, data, onSaveToProject, onRetry, onDatabaseSelect, onDatabaseSearch }) {
  const [databaseTopic, setDatabaseTopic] = useState('');

  return (
    <section id="paper-context-bar" className="paper-context-bar">
      {state === 'idle' && (
        <div id="context-state-idle" className="context-state context-state-idle-full">
          <div className="database-select-card">
            <p className="database-select-title">Select database</p>
            <p className="database-select-subtitle">Select database to search:</p>
            <div className="database-list">
              {[
                { name: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/' },
                { name: 'Google Scholar', url: 'https://scholar.google.com/' },
                { name: 'Scopus', url: 'https://www.scopus.com/' },
                { name: 'ScienceDirect', url: 'https://www.sciencedirect.com/' }
              ].map(db => (
                <button
                  key={db.name}
                  type="button"
                  className="database-item"
                  onClick={() => onDatabaseSelect(db.url)}
                >
                  <span className={`database-name database-${db.name.toLowerCase().replace(' ', '')}`}>
                    {db.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="database-divider">
              <span className="database-divider-text">or</span>
            </div>
            <p className="database-recommend-label">Recommend databases based on my research topic:</p>
            <div className="database-recommend-input-wrap">
              <input
                type="text"
                className="database-topic-input"
                placeholder="Input research topic"
                value={databaseTopic}
                onChange={(e) => setDatabaseTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onDatabaseSearch(databaseTopic);
                  }
                }}
              />
              <button
                type="button"
                className="database-topic-search-btn"
                onClick={() => onDatabaseSearch(databaseTopic)}
                title="Search"
              >
                🔍
              </button>
            </div>
          </div>
        </div>
      )}
      {state === 'loading' && (
        <div id="context-state-loading" className="context-state">
          <span className="spinner"></span>
          <span>Loading paper context…</span>
        </div>
      )}
      {state === 'ready' && (
        <div id="context-state-ready" className="context-state">
          <span className="context-icon">✓</span>
          <span id="context-title">{data.title || 'Current page'}</span>
          <span id="context-source" className="context-source">
            {data.source ? new URL(data.source).hostname : ''}
          </span>
          <button
            type="button"
            className="btn-save-to-project"
            onClick={onSaveToProject}
            title="Save to project"
          >
            Save to project
          </button>
        </div>
      )}
      {state === 'error' && (
        <div id="context-state-error" className="context-state">
          <span className="context-icon">⚠️</span>
          <span id="context-error-message">{data.message || 'Error loading context'}</span>
          <button type="button" className="link-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

// Paper View CTA Component
function PaperViewCTA({ onQuickAction }) {
  const quickActions = [
    'Extract Key Evidence',
    'Summarize Conclusions',
    'Background Overview',
    'Explain this Figure'
  ];

  return (
    <section id="paper-view-cta-section">
      <p className="paper-view-cta">
        <span className="highlight-word">Highlight text</span> on the page to get an explanation
      </p>
      <div className="paper-view-divider">or</div>
      <div className="ai-actions">
        {quickActions.map(action => (
          <button
            key={action}
            type="button"
            className="ai-action-pill quick-action-chip"
            onClick={() => onQuickAction(action)}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}

// Workspace Section Component
function WorkspaceSection({ 
  expanded, 
  onToggle, 
  projects, 
  activeTab, 
  onTabChange,
  onCreateProject,
  onOpenProject,
  onDeleteProject
}) {
  return (
    <section className="workspace-section">
      <div className="workspace-header">
        <h2>Projects</h2>
        <button className="toggle-btn" onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '−' : '+'}
        </button>
      </div>
      {expanded && (
        <div id="workspace-content" className="workspace-content">
          <div className="workspace-tabs">
            <button
              className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => onTabChange('projects')}
            >
              📁 Projects
            </button>
          </div>
          <div id="tab-projects" className={`tab-content ${activeTab === 'projects' ? 'active' : ''}`}>
            <ProjectsList
              projects={projects}
              onOpenProject={onOpenProject}
              onDeleteProject={onDeleteProject}
            />
            <button id="btn-create-project" className="btn-primary" onClick={onCreateProject}>
              + Create project
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Projects List Component
function ProjectsList({ projects, onOpenProject, onDeleteProject }) {
  if (!projects || projects.length === 0) {
    return (
      <div id="projects-list" className="projects-list">
        <div className="empty-state">No projects yet. Create one, then save papers from the context bar.</div>
      </div>
    );
  }

  return (
    <div id="projects-list" className="projects-list">
      {projects.map(project => {
        const count = project.paperCount || 0;
        return (
          <div key={project.id} className="project-item">
            <div className="project-name">{project.name}</div>
            <div className="project-count">{count} paper{count !== 1 ? 's' : ''}</div>
            <div className="project-actions">
              <button className="icon-btn" onClick={() => onOpenProject(project.id)}>
                Open
              </button>
              <button
                className="icon-btn icon-btn-danger"
                onClick={() => onDeleteProject(project.id)}
                title="Delete project"
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Question Section Component
function QuestionSection({ onSendQuestion, onQuickAction }) {
  const [question, setQuestion] = useState('');

  const handleSend = () => {
    if (question.trim()) {
      onSendQuestion(question);
      setQuestion('');
    }
  };

  const quickActions = [
    'Summarize this section',
    'Explain this figure',
    'Key findings'
  ];

  return (
    <section className="question-section">
      <div className="question-input-wrapper">
        <textarea
          id="question-input"
          className="question-input"
          placeholder="Type your question…"
          rows="2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button id="btn-send-question" className="btn-send" onClick={handleSend} title="Send">
          ➤
        </button>
      </div>
      <p className="chat-drag-hint">You can also paste or drag screenshots here.</p>
      <div id="quick-actions" className="quick-actions">
        {quickActions.map(action => (
          <button
            key={action}
            type="button"
            className="quick-action-chip"
            onClick={() => onQuickAction(action)}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}

// Response Section Component
function ResponseSection({ expanded, onToggle, messages }) {
  return (
    <section className="response-section">
      <div className="response-header">
        <h3>Responses</h3>
        <button className="toggle-btn" onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '−' : '+'}
        </button>
      </div>
      {expanded && (
        <div id="response-content" className="response-content">
          <div id="response-thread" className="response-thread">
            {messages.length === 0 ? (
              <div className="empty-state">Ask a question or use an action above.</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message-bubble message-${msg.role}`}>
                  {msg.content}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// Modals Component
function Modals({
  activeModal,
  onClose,
  onCreateProject,
  projects,
  onSaveToProject,
  currentProjectPapers,
  projectName,
  onGenerateWorksCited,
  onGenerateAnnotatedBib
}) {
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  if (!activeModal) return null;

  return (
    <div id="modal-overlay" className="modal-overlay" onClick={(e) => {
      if (e.target.id === 'modal-overlay') onClose();
    }}>
      {activeModal === 'create-project' && (
        <div id="modal-create-project" className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Create project</h3>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="modal-body">
            <input
              type="text"
              id="project-name-input"
              placeholder="Project name"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreateProject(projectNameInput);
                  setProjectNameInput('');
                }
              }}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => {
                onCreateProject(projectNameInput);
                setProjectNameInput('');
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {activeModal === 'save-to-project' && (
        <SaveToProjectModal
          projects={projects}
          search={projectSearch}
          onSearchChange={setProjectSearch}
          onSave={onSaveToProject}
          onClose={onClose}
        />
      )}

      {activeModal === 'project-table' && (
        <ProjectTableModal
          projectName={projectName}
          papers={currentProjectPapers}
          search={tableSearch}
          onSearchChange={setTableSearch}
          onGenerateWorksCited={onGenerateWorksCited}
          onGenerateAnnotatedBib={onGenerateAnnotatedBib}
          onClose={onClose}
        />
      )}
    </div>
  );
}

// Save to Project Modal Component
function SaveToProjectModal({ projects, search, onSearchChange, onSave, onClose }) {
  const filteredProjects = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="modal-save-to-project" className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Save to project</h3>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="modal-body">
        <p className="modal-hint">Save this paper with an AI summary and citation.</p>
        <div className="search-input-wrap">
          <input
            type="text"
            id="save-to-project-search"
            placeholder="Search for project"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span aria-hidden="true">🔍</span>
        </div>
        <div id="save-to-project-list" className="project-pick-list">
          {filteredProjects.length === 0 ? (
            <div className="empty-state">No projects found.</div>
          ) : (
            filteredProjects.map(project => {
              const count = project.paperCount || 0;
              return (
                <div
                  key={project.id}
                  className="project-pick-item"
                  onClick={() => onSave(project.id)}
                >
                  <span>{project.name}</span>
                  <span className="project-paper-count">{count} paper{count !== 1 ? 's' : ''}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Project Table Modal Component
function ProjectTableModal({ projectName, papers, search, onSearchChange, onGenerateWorksCited, onGenerateAnnotatedBib, onClose }) {
  const flattenSummary = (summary) => {
    if (!summary || typeof summary !== 'object') return '';
    const parts = [];
    for (const key of ['objective', 'methodology', 'results', 'limitations']) {
      if (Array.isArray(summary[key])) parts.push(...summary[key]);
    }
    return parts.join(' ');
  };

  const formatSummaryForTable = (summary) => {
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
  };

  const escapeHtml = (s) => {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };

  const filteredPapers = papers.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const citation = (p.citation || '').toLowerCase();
    const summary = flattenSummary(p.summary).toLowerCase();
    return title.includes(searchLower) || citation.includes(searchLower) || summary.includes(searchLower);
  });

  const handleCopyCitation = (citation) => {
    navigator.clipboard.writeText(citation);
  };

  return (
    <div id="modal-project-table" className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
      <div className="modal-body">
        <div className="modal-back-row">
          <button type="button" className="modal-back-btn" onClick={onClose} aria-label="Back">←</button>
          <h3 id="project-table-title">{projectName || 'Project'}</h3>
        </div>
        <div className="project-table-actions">
          <button type="button" className="btn-outline" onClick={onGenerateWorksCited}>
            Generate Works Cited
          </button>
          <button type="button" className="btn-outline" onClick={onGenerateAnnotatedBib}>
            Generate Annotated Bib
          </button>
        </div>
        <div className="search-input-wrap">
          <input
            type="text"
            id="project-table-search"
            placeholder="Search for paper"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span aria-hidden="true">🔍</span>
        </div>
        <div className="project-table-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Paper</th>
                <th>Overview</th>
                <th>Citation</th>
              </tr>
            </thead>
            <tbody id="project-table-body">
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">
                    {papers.length === 0 ? 'No papers in this project. Save papers from the context bar.' : 'No papers match your search.'}
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper, idx) => {
                  const summaryHtml = formatSummaryForTable(paper.summary);
                  const citation = paper.citation || `${paper.title}. ${paper.url}`;
                  return (
                    <tr key={idx}>
                      <td>
                        <a className="paper-link" href={paper.url} target="_blank" rel="noopener">
                          {paper.title}
                        </a>
                      </td>
                      <td className="summary-cell" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                      <td className="citation-cell">
                        <span className="citation-text">{citation}</span>
                        <div className="citation-actions">
                          <button
                            type="button"
                            className="btn-copy-citation"
                            onClick={() => handleCopyCitation(citation)}
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SidebarApp />);
} else {
  // Fallback: create root element if it doesn't exist
  const rootEl = document.createElement('div');
  rootEl.id = 'root';
  document.body.appendChild(rootEl);
  const root = createRoot(rootEl);
  root.render(<SidebarApp />);
}
