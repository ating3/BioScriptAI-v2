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
  const journal = paper.journal || ''
  const doi = paper.doi ? `https://doi.org/${paper.doi}` : paper.url || ''
  const parts = [authors, year ? `${year}.` : '', title ? `${title}.` : '', journal ? `${journal}.` : '', doi].filter(Boolean)
  return parts.join(' ')
}

export function detectPaperSource(url) {
  if (!url) return null
  const u = url
  // ── Major preprint & biomedical databases ──────────────────────────────────
  if (u.includes('pubmed.ncbi') || u.includes('ncbi.nlm.nih.gov/pmc') || u.includes('pmc.ncbi.nlm.nih.gov')) return 'pubmed'
  if (u.includes('arxiv.org')) return 'arxiv'
  if (u.includes('biorxiv.org')) return 'biorxiv'
  if (u.includes('medrxiv.org')) return 'medrxiv'
  if (u.includes('chemrxiv.org')) return 'chemrxiv'
  if (u.includes('ssrn.com')) return 'ssrn'
  if (u.includes('researchsquare.com')) return 'researchsquare'
  if (u.includes('preprints.org')) return 'preprints'
  if (u.includes('osf.io')) return 'osf'
  // ── Major publishers ───────────────────────────────────────────────────────
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
  if (u.includes('rupress.org')) return 'rockefeller'
  if (u.includes('jneurosci.org')) return 'jneurosci'
  if (u.includes('pnas.org')) return 'pnas'
  if (u.includes('embopress.org')) return 'embo'
  if (u.includes('annualreviews.org')) return 'annualreviews'
  if (u.includes('jbc.org')) return 'jbc'
  if (u.includes('jimmunol.org')) return 'jimmunol'
  if (u.includes('bloodjournal.org')) return 'blood'
  if (u.includes('diabetesjournals.org')) return 'diabetes'
  if (u.includes('jci.org')) return 'jci'
  // ── Aggregators & repositories ─────────────────────────────────────────────
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
  if (u.includes('worldscientific.com')) return 'worldscientific'
  if (u.includes('degruyter.com')) return 'degruyter'
  if (u.includes('thieme-connect.com') || u.includes('thieme.de')) return 'thieme'
  return 'generic'
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
