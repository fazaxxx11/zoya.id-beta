// References library unit tests
// ==============================
// Validates citation formatting (APA 7, IEEE, Vancouver, Harvard),
// author joining rules, BibTeX & RIS parsers, CrossRef → ref mapping.

import { describe, it, expect } from 'vitest'
import {
  newRef,
  formatAuthor, joinAuthors, inlineCite,
  formatAPA, formatIEEE, formatVancouver, formatHarvard,
  buildBibliography,
  parseBibtex, parseRIS,
  crossrefToRef,
} from '../src/lib/references.js'

// ============================================================
// Author formatting
// ============================================================
describe('formatAuthor', () => {
  const a = { family: 'Smith', given: 'John Robert' }

  it('APA: Family, F. R.', () => {
    expect(formatAuthor(a, 'apa')).toBe('Smith, J. R.')
  })

  it('IEEE: F. R. Family', () => {
    expect(formatAuthor(a, 'ieee')).toBe('J. R. Smith')
  })

  it('Vancouver: Family FR', () => {
    expect(formatAuthor(a, 'vancouver')).toBe('Smith JR')
  })

  it('Harvard: Family, F.R.', () => {
    expect(formatAuthor(a, 'harvard')).toBe('Smith, J.R.')
  })

  it('handles single given name', () => {
    expect(formatAuthor({ family: 'Doe', given: 'Jane' }, 'apa')).toBe('Doe, J.')
  })

  it('handles missing given name', () => {
    expect(formatAuthor({ family: 'Aristotle' }, 'apa')).toBe('Aristotle')
  })

  it('returns empty for invalid input', () => {
    expect(formatAuthor(null)).toBe('')
    expect(formatAuthor({})).toBe('')
  })
})

describe('joinAuthors', () => {
  const single = [{ family: 'Smith', given: 'J' }]
  const dual = [
    { family: 'Smith', given: 'J' },
    { family: 'Doe', given: 'A' },
  ]
  const triple = [
    { family: 'Smith', given: 'J' },
    { family: 'Doe', given: 'A' },
    { family: 'Brown', given: 'B' },
  ]

  it('APA single → just one', () => {
    expect(joinAuthors(single, 'apa')).toBe('Smith, J.')
  })

  it('APA two → "&" before last', () => {
    expect(joinAuthors(dual, 'apa')).toBe('Smith, J., & Doe, A.')
  })

  it('APA three → comma + "&"', () => {
    expect(joinAuthors(triple, 'apa')).toBe('Smith, J., Doe, A., & Brown, B.')
  })

  it('IEEE three → "and" before last', () => {
    expect(joinAuthors(triple, 'ieee')).toBe('J. Smith, A. Doe, and B. Brown')
  })

  it('Vancouver six+ → et al', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ family: 'A' + i, given: 'X' }))
    const result = joinAuthors(seven, 'vancouver')
    expect(result).toMatch(/et al$/)
  })

  it('Harvard "and" before last', () => {
    expect(joinAuthors(dual, 'harvard')).toBe('Smith, J. and Doe, A.')
  })

  it('APA > 20 authors → first 19, ..., last', () => {
    const many = Array.from({ length: 22 }, (_, i) => ({ family: 'Author' + i, given: 'X' }))
    const result = joinAuthors(many, 'apa')
    expect(result).toContain('...')
    expect(result).toContain('Author21')
  })
})

// ============================================================
// Inline citation
// ============================================================
describe('inlineCite', () => {
  it('APA single author', () => {
    const ref = { authors: [{ family: 'Smith' }], year: 2020 }
    expect(inlineCite(ref, 'apa')).toBe('(Smith, 2020)')
  })

  it('APA two authors', () => {
    const ref = { authors: [{ family: 'Smith' }, { family: 'Doe' }], year: 2020 }
    expect(inlineCite(ref, 'apa')).toBe('(Smith & Doe, 2020)')
  })

  it('APA 3+ authors → et al', () => {
    const ref = {
      authors: [{ family: 'Smith' }, { family: 'Doe' }, { family: 'Brown' }],
      year: 2020,
    }
    expect(inlineCite(ref, 'apa')).toBe('(Smith et al., 2020)')
  })

  it('Harvard two authors uses "and"', () => {
    const ref = { authors: [{ family: 'Smith' }, { family: 'Doe' }], year: 2020 }
    expect(inlineCite(ref, 'harvard')).toBe('(Smith and Doe, 2020)')
  })

  it('IEEE → bracket index', () => {
    expect(inlineCite({}, 'ieee', 5)).toBe('[5]')
  })

  it('Vancouver → bracket index', () => {
    expect(inlineCite({}, 'vancouver', 12)).toBe('[12]')
  })

  it('falls back to "n.d." when year missing', () => {
    const ref = { authors: [{ family: 'X' }] }
    expect(inlineCite(ref, 'apa')).toBe('(X, n.d.)')
  })
})

// ============================================================
// Full citation formatters
// ============================================================
describe('formatAPA — article', () => {
  const ref = {
    type: 'article',
    title: 'A study on motivation',
    authors: [
      { family: 'Smith', given: 'John' },
      { family: 'Doe', given: 'Alice' },
    ],
    year: 2020,
    journal: 'Journal of Education',
    volume: '15',
    issue: '3',
    pages: '120-135',
    doi: '10.1234/abcd',
  }

  it('produces standard APA 7 article format', () => {
    const out = formatAPA(ref)
    expect(out).toContain('Smith, J., & Doe, A.')
    expect(out).toContain('(2020)')
    expect(out).toContain('A study on motivation')
    expect(out).toContain('Journal of Education')
    expect(out).toContain('15')
    expect(out).toContain('(3)')
    expect(out).toContain('120-135')
    expect(out).toContain('https://doi.org/10.1234/abcd')
  })

  it('strips DOI prefix if user pasted full URL', () => {
    const r = { ...ref, doi: 'https://doi.org/10.1234/abcd' }
    expect(formatAPA(r)).toContain('https://doi.org/10.1234/abcd')
    expect(formatAPA(r).match(/https:\/\/doi/g).length).toBe(1)
  })

  it('uses (n.d.) when year missing', () => {
    const r = { ...ref, year: null }
    expect(formatAPA(r)).toContain('(n.d.)')
  })
})

describe('formatAPA — book', () => {
  it('formats book with publisher', () => {
    const ref = {
      type: 'book',
      title: 'Handbook of Research',
      authors: [{ family: 'Brown', given: 'Bob' }],
      year: 2019,
      publisher: 'Sage Publications',
    }
    const out = formatAPA(ref)
    expect(out).toContain('Brown, B.')
    expect(out).toContain('(2019)')
    expect(out).toContain('Handbook of Research')
    expect(out).toContain('Sage Publications')
  })
})

describe('formatAPA — thesis (Indonesia context)', () => {
  it('formats Indonesian skripsi', () => {
    const ref = {
      type: 'thesis',
      title: 'Pengaruh motivasi terhadap prestasi',
      authors: [{ family: 'Putri', given: 'Sari' }],
      year: 2023,
      thesisType: 'Skripsi',
      institution: 'Universitas Indonesia',
    }
    const out = formatAPA(ref)
    expect(out).toContain('Putri, S.')
    expect(out).toContain('Pengaruh motivasi')
    expect(out).toContain('[Skripsi]')
    expect(out).toContain('Universitas Indonesia')
  })
})

describe('formatIEEE', () => {
  it('produces numbered article format', () => {
    const ref = {
      type: 'article',
      title: 'Deep learning for X',
      authors: [{ family: 'Smith', given: 'J' }, { family: 'Doe', given: 'A' }],
      year: 2020,
      journal: 'IEEE Trans.',
      volume: '5',
      issue: '2',
      pages: '10-20',
      doi: '10.1109/abc',
    }
    const out = formatIEEE(ref, 1)
    expect(out).toMatch(/^\[1\]/)
    expect(out).toContain('J. Smith and A. Doe')
    expect(out).toContain('"Deep learning for X,"')
    expect(out).toContain('vol. 5')
    expect(out).toContain('no. 2')
    expect(out).toContain('pp. 10-20')
    expect(out).toContain('2020')
    expect(out).toContain('doi: 10.1109/abc')
  })
})

describe('formatVancouver', () => {
  it('produces compact medical format', () => {
    const ref = {
      type: 'article',
      title: 'Clinical trial of X',
      authors: [{ family: 'Smith', given: 'John' }, { family: 'Doe', given: 'Alice' }],
      year: 2020,
      journal: 'JAMA',
      volume: '323',
      issue: '5',
      pages: '500-510',
    }
    const out = formatVancouver(ref, 1)
    expect(out).toMatch(/^1\./)
    expect(out).toContain('Smith J')
    expect(out).toContain('Doe A')
    expect(out).toContain('JAMA')
    expect(out).toContain('2020;323(5):500-510')
  })
})

describe('formatHarvard', () => {
  it('produces British social science format', () => {
    const ref = {
      type: 'article',
      title: 'Social impact study',
      authors: [{ family: 'Smith', given: 'J' }, { family: 'Doe', given: 'A' }],
      year: 2020,
      journal: 'Sociology',
      volume: '54',
      pages: '100-120',
    }
    const out = formatHarvard(ref)
    expect(out).toContain('Smith, J. and Doe, A.')
    expect(out).toContain('(2020)')
    expect(out).toContain("'Social impact study'")
    expect(out).toContain('Sociology')
    expect(out).toContain('pp. 100-120')
  })
})

// ============================================================
// Bibliography
// ============================================================
describe('buildBibliography', () => {
  const refs = [
    { type: 'article', title: 'B Study', authors: [{ family: 'Brown', given: 'B' }], year: 2020, journal: 'J' },
    { type: 'article', title: 'A Study', authors: [{ family: 'Adams', given: 'A' }], year: 2021, journal: 'J' },
    { type: 'article', title: 'C Study', authors: [{ family: 'Clark', given: 'C' }], year: 2019, journal: 'J' },
  ]

  it('APA: alphabetical by first author family', () => {
    const out = buildBibliography(refs, 'apa')
    const adamsIdx = out.indexOf('Adams')
    const brownIdx = out.indexOf('Brown')
    const clarkIdx = out.indexOf('Clark')
    expect(adamsIdx).toBeLessThan(brownIdx)
    expect(brownIdx).toBeLessThan(clarkIdx)
  })

  it('IEEE: numbered in insertion order', () => {
    const out = buildBibliography(refs, 'ieee')
    expect(out).toMatch(/\[1\][\s\S]*Brown/)
    expect(out).toMatch(/\[2\][\s\S]*Adams/)
    expect(out).toMatch(/\[3\][\s\S]*Clark/)
  })

  it('Vancouver: numbered in insertion order', () => {
    const out = buildBibliography(refs, 'vancouver')
    expect(out).toMatch(/^1\./)
    expect(out).toContain('2.')
    expect(out).toContain('3.')
  })
})

// ============================================================
// BibTeX parser
// ============================================================
describe('parseBibtex', () => {
  it('parses a single article entry', () => {
    const bib = `@article{smith2020,
  author = {Smith, John and Doe, Alice},
  title = {A study on X},
  journal = {Journal of Y},
  year = {2020},
  volume = {15},
  number = {3},
  pages = {120--135},
  doi = {10.1234/abcd}
}`
    const refs = parseBibtex(bib)
    expect(refs).toHaveLength(1)
    const r = refs[0]
    expect(r.type).toBe('article')
    expect(r.title).toBe('A study on X')
    expect(r.authors).toHaveLength(2)
    expect(r.authors[0].family).toBe('Smith')
    expect(r.authors[0].given).toBe('John')
    expect(r.authors[1].family).toBe('Doe')
    expect(r.year).toBe(2020)
    expect(r.volume).toBe('15')
    expect(r.issue).toBe('3')
    expect(r.pages).toBe('120-135')
    expect(r.doi).toBe('10.1234/abcd')
  })

  it('parses multiple entries', () => {
    const bib = `
@article{a,
  author = {A, B},
  title = {T1},
  year = {2020}
}

@book{b,
  author = {C, D},
  title = {T2},
  year = {2021},
  publisher = {Pub}
}
`
    const refs = parseBibtex(bib)
    expect(refs).toHaveLength(2)
    expect(refs[0].type).toBe('article')
    expect(refs[1].type).toBe('book')
    expect(refs[1].publisher).toBe('Pub')
  })

  it('handles author in "Given Family" format', () => {
    const bib = `@article{x,
  author = {John Smith and Alice Doe},
  title = {T},
  year = {2020}
}`
    const refs = parseBibtex(bib)
    expect(refs[0].authors[0].family).toBe('Smith')
    expect(refs[0].authors[0].given).toBe('John')
  })

  it('maps phdthesis → thesis', () => {
    const bib = `@phdthesis{x,
  author = {Y, Z},
  title = {T},
  year = {2020},
  school = {Universitas}
}`
    const refs = parseBibtex(bib)
    expect(refs[0].type).toBe('thesis')
    expect(refs[0].institution).toBe('Universitas')
  })

  it('returns empty array for invalid input', () => {
    expect(parseBibtex('')).toEqual([])
    expect(parseBibtex('not bibtex')).toEqual([])
  })
})

// ============================================================
// RIS parser
// ============================================================
describe('parseRIS', () => {
  it('parses a single article entry', () => {
    const ris = `TY  - JOUR
AU  - Smith, John
AU  - Doe, Alice
TI  - A study on X
JO  - Journal of Y
PY  - 2020
VL  - 15
IS  - 3
SP  - 120
EP  - 135
DO  - 10.1234/abcd
ER  - `
    const refs = parseRIS(ris)
    expect(refs).toHaveLength(1)
    const r = refs[0]
    expect(r.type).toBe('article')
    expect(r.title).toBe('A study on X')
    expect(r.authors).toHaveLength(2)
    expect(r.authors[0].family).toBe('Smith')
    expect(r.authors[0].given).toBe('John')
    expect(r.year).toBe(2020)
    expect(r.volume).toBe('15')
    expect(r.issue).toBe('3')
    expect(r.pages).toBe('120-135')
    expect(r.doi).toBe('10.1234/abcd')
  })

  it('maps TY codes correctly', () => {
    const ris = `TY  - BOOK
AU  - X, Y
TI  - T
PY  - 2020
ER  - `
    expect(parseRIS(ris)[0].type).toBe('book')
  })
})

// ============================================================
// CrossRef → ref mapping
// ============================================================
describe('crossrefToRef', () => {
  it('maps CrossRef article message to ref schema', () => {
    const msg = {
      type: 'journal-article',
      title: ['A study on X'],
      author: [
        { family: 'Smith', given: 'John' },
        { family: 'Doe', given: 'Alice' },
      ],
      issued: { 'date-parts': [[2020, 5, 1]] },
      'container-title': ['Journal of Y'],
      volume: '15',
      issue: '3',
      page: '120-135',
      DOI: '10.1234/abcd',
      URL: 'https://doi.org/10.1234/abcd',
      publisher: 'Wiley',
    }
    const ref = crossrefToRef(msg)
    expect(ref.type).toBe('article')
    expect(ref.title).toBe('A study on X')
    expect(ref.authors).toHaveLength(2)
    expect(ref.year).toBe(2020)
    expect(ref.journal).toBe('Journal of Y')
    expect(ref.doi).toBe('10.1234/abcd')
  })

  it('detects book type', () => {
    const msg = {
      type: 'book',
      title: ['Handbook'],
      author: [{ family: 'X', given: 'Y' }],
      issued: { 'date-parts': [[2019]] },
    }
    expect(crossrefToRef(msg).type).toBe('book')
  })

  it('returns null for empty input', () => {
    expect(crossrefToRef(null)).toBeNull()
  })
})

describe('newRef', () => {
  it('creates ref with defaults and unique id', () => {
    const r1 = newRef('article')
    const r2 = newRef('book')
    expect(r1.id).not.toBe(r2.id)
    expect(r1.type).toBe('article')
    expect(r2.type).toBe('book')
    expect(r1.authors).toEqual([])
    expect(r1.tags).toEqual([])
  })
})
