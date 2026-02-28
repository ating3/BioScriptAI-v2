import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatAuthors(authors) {
  if (!authors || authors.length === 0) return 'Unknown Authors'
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return authors.join(' & ')
  return `${authors[0]} et al.`
}

export function formatYear(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).getFullYear().toString()
}

export function truncate(str, maxLen = 80) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

export function generateBibTeX(paper) {
  const key = `${(paper.authors?.[0]?.split(' ').pop() || 'Unknown')}${paper.year || ''}${paper.title?.split(' ')[0] || ''}`
  return `@article{${key},
  title={${paper.title || ''}},
  author={${(paper.authors || []).join(' and ')}},
  journal={${paper.journal || ''}},
  year={${paper.year || ''}},
  doi={${paper.doi || ''}},
  url={${paper.url || ''}}
}`
}

export function generateAPA(paper) {
  const authors = (paper.authors || []).join(', ')
  const year = paper.year ? `(${paper.year})` : ''
  const title = paper.title || ''
  const journal = paper.journal ? `*${paper.journal}*` : ''
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url || ''
  return `${authors} ${year}. ${title}. ${journal}. ${doi}`
}

export function detectPaperSource(url) {
  if (!url) return null
  if (url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) return 'pubmed'
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

export function detectSection(text) {
  const lower = text.toLowerCase()
  if (lower.includes('abstract')) return 'Abstract'
  if (lower.includes('introduction')) return 'Introduction'
  if (lower.includes('method') || lower.includes('material')) return 'Methodology'
  if (lower.includes('result')) return 'Results'
  if (lower.includes('discussion')) return 'Discussion'
  if (lower.includes('conclusion')) return 'Conclusion'
  if (lower.includes('reference') || lower.includes('bibliography')) return 'References'
  return 'Body'
}
