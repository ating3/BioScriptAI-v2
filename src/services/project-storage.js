/**
 * Local project and paper storage (no Zotero required).
 * Stores projects and papers in chrome.storage.local with AI summaries and citations.
 */

const STORAGE_KEY = 'bioscriptProjects';

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Format APA-style citation from title and URL (no author/year from page).
 * @param {Object} paper - { title, url, addedAt? }
 * @returns {string}
 */
export function formatCitation(paper) {
  const title = paper.title || 'Untitled';
  const url = paper.url || '';
  const year = paper.addedAt
    ? new Date(paper.addedAt).getFullYear()
    : new Date().getFullYear();
  // APA: Title. (Year). Retrieved from URL
  if (url) {
    return `${title}. (${year}). Retrieved from ${url}`;
  }
  return `${title}. (${year}).`;
}

/**
 * @returns {Promise<{ projects: Array, papers: Array }>}
 */
export async function getWorkspace() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const data = result[STORAGE_KEY] || { projects: [], papers: [] };
  data.projects = data.projects || [];
  data.papers = data.papers || [];
  return data;
}

export async function setWorkspace(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * @returns {Promise<Array<{ id, name, createdAt }>>}
 */
export async function listProjects() {
  const { projects } = await getWorkspace();
  return projects.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * @param {string} name
 * @returns {Promise<{ id, name, createdAt }>}
 */
export async function createProject(name) {
  const data = await getWorkspace();
  const project = {
    id: generateId(),
    name: (name || '').trim() || 'Untitled project',
    createdAt: Date.now(),
    paperIds: []
  };
  data.projects.push(project);
  await setWorkspace(data);
  return project;
}

/**
 * @param {string} projectId
 * @returns {Promise<Array>} Papers in this project with summary and citation
 */
export async function getProjectPapers(projectId) {
  const data = await getWorkspace();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return [];

  const paperIds = project.paperIds || [];
  return paperIds
    .map(pid => data.papers.find(p => p.id === pid))
    .filter(Boolean)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

/**
 * Find or create paper by url; add to project; optionally generate summary and citation.
 * @param {string} projectId
 * @param {Object} paper - { title, url }
 * @param {string} [paperContext] - Visible text for AI summary
 * @param {Object} [summary] - Pre-generated summary from summarization module
 * @returns {Promise<{ paperId: string, isNew: boolean }>}
 */
export async function addPaperToProject(projectId, paper, paperContext = null, summary = null) {
  const data = await getWorkspace();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  if (!project.paperIds) project.paperIds = [];

  let existing = data.papers.find(p => p.url === paper.url);
  let isNew = false;
  if (!existing) {
    existing = {
      id: generateId(),
      title: (paper.title || '').trim() || 'Untitled',
      url: paper.url || '',
      addedAt: Date.now(),
      citation: formatCitation({ ...paper, addedAt: Date.now() }),
      summary: null,
      projectIds: []
    };
    data.papers.push(existing);
    isNew = true;
  }

  if (!existing.projectIds.includes(projectId)) {
    existing.projectIds.push(projectId);
  }

  if (!project.paperIds) project.paperIds = [];
  if (!project.paperIds.includes(existing.id)) {
    project.paperIds.push(existing.id);
  }

  existing.citation = existing.citation || formatCitation({ ...existing, addedAt: existing.addedAt });
  if (summary) {
    existing.summary = summary;
  }

  await setWorkspace(data);
  return { paperId: existing.id, isNew };
}

/**
 * @param {string} projectId
 * @param {string} paperId
 */
export async function removePaperFromProject(projectId, paperId) {
  const data = await getWorkspace();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return;
  if (project.paperIds) {
    project.paperIds = project.paperIds.filter(id => id !== paperId);
  }
  const paper = data.papers.find(p => p.id === paperId);
  if (paper && paper.projectIds) {
    paper.projectIds = paper.projectIds.filter(id => id !== projectId);
    if (paper.projectIds.length === 0) {
      data.papers = data.papers.filter(p => p.id !== paperId);
    }
  }
  await setWorkspace(data);
}

/**
 * @param {string} projectId
 */
export async function deleteProject(projectId) {
  const data = await getWorkspace();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return;
  const paperIds = project.paperIds || [];
  data.projects = data.projects.filter(p => p.id !== projectId);
  for (const pid of paperIds) {
    const paper = data.papers.find(p => p.id === pid);
    if (paper && paper.projectIds) {
      paper.projectIds = paper.projectIds.filter(id => id !== projectId);
      if (paper.projectIds.length === 0) {
        data.papers = data.papers.filter(p => p.id !== pid);
      }
    }
  }
  await setWorkspace(data);
}
