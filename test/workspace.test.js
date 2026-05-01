// Workspace backup/restore unit tests
// ===================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  exportWorkspace, restoreWorkspace, validateBackup,
  workspaceStats, isWorkspaceEmpty, clearWorkspace,
} from '../src/lib/workspace.js'

// Polyfill localStorage for Node environment (Vitest default uses Node, not jsdom).
// Lib functions look up `localStorage` via global scope at call time, so installing
// the polyfill before any test runs is enough.
beforeEach(() => {
  if (typeof globalThis.localStorage === 'undefined' || !globalThis.__lsPolyfill) {
    let store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
      clear: () => { store = {} },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length },
    }
    globalThis.__lsPolyfill = true
  }
  localStorage.clear()
})

describe('workspaceStats', () => {
  it('returns zeros when empty', () => {
    const s = workspaceStats()
    expect(s.surveys).toBe(0)
    expect(s.references).toBe(0)
    expect(s.qualDocs).toBe(0)
  })

  it('counts items correctly', () => {
    localStorage.setItem('kuesioner_surveys', JSON.stringify([{ id: 's1' }, { id: 's2' }]))
    localStorage.setItem('kuesioner_responses', JSON.stringify({
      s1: [{ a: 1 }, { a: 2 }, { a: 3 }],
      s2: [{ a: 1 }],
    }))
    localStorage.setItem('lib_references_v1', JSON.stringify([{ id: 'r1' }]))
    const s = workspaceStats()
    expect(s.surveys).toBe(2)
    expect(s.responses).toBe(4)
    expect(s.references).toBe(1)
  })

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('kuesioner_surveys', '{not json')
    expect(() => workspaceStats()).not.toThrow()
    expect(workspaceStats().surveys).toBe(0)
  })
})

describe('isWorkspaceEmpty', () => {
  it('true when nothing set', () => {
    expect(isWorkspaceEmpty()).toBe(true)
  })

  it('false when surveys exist', () => {
    localStorage.setItem('kuesioner_surveys', JSON.stringify([{ id: 's1' }]))
    expect(isWorkspaceEmpty()).toBe(false)
  })
})

describe('exportWorkspace', () => {
  it('creates JSON-serializable structure with metadata', () => {
    localStorage.setItem('lib_references_v1', JSON.stringify([{ id: 'r1', title: 'x' }]))
    const ws = exportWorkspace()
    expect(ws.appName).toBe('z-research-tools')
    expect(ws.schemaVersion).toBe(1)
    expect(typeof ws.exportedAt).toBe('string')
    expect(ws.data['lib_references_v1']).toEqual([{ id: 'r1', title: 'x' }])
    expect(ws.stats.references).toBe(1)
    // Must be JSON-roundtrippable
    expect(() => JSON.parse(JSON.stringify(ws))).not.toThrow()
  })

  it('does NOT include auth/wallet/system keys', () => {
    localStorage.setItem('skor_users', JSON.stringify([{ secret: 'x' }]))
    localStorage.setItem('skor_wallet', JSON.stringify({ balance: 9999 }))
    localStorage.setItem('zoya_theme', 'dark')
    const ws = exportWorkspace()
    expect(ws.data).not.toHaveProperty('skor_users')
    expect(ws.data).not.toHaveProperty('skor_wallet')
    expect(ws.data).not.toHaveProperty('zoya_theme')
  })
})

describe('validateBackup', () => {
  it('rejects null/undefined', () => {
    expect(validateBackup(null).valid).toBe(false)
    expect(validateBackup(undefined).valid).toBe(false)
  })

  it('rejects different appName', () => {
    expect(validateBackup({ appName: 'other-app', data: {} }).valid).toBe(false)
  })

  it('rejects future schema version', () => {
    expect(validateBackup({ schemaVersion: 99, data: { lib_references_v1: [] } }).valid).toBe(false)
  })

  it('rejects file without recognized keys', () => {
    expect(validateBackup({ data: { random_key: [] } }).valid).toBe(false)
  })

  it('accepts valid backup', () => {
    const v = validateBackup({
      appName: 'z-research-tools',
      schemaVersion: 1,
      data: { lib_references_v1: [{ id: 'r1' }] },
    })
    expect(v.valid).toBe(true)
    expect(v.recognizedKeys).toContain('lib_references_v1')
  })
})

describe('restoreWorkspace — replace mode', () => {
  it('overwrites existing data', () => {
    localStorage.setItem('lib_references_v1', JSON.stringify([{ id: 'old' }]))
    const result = restoreWorkspace({
      appName: 'z-research-tools',
      schemaVersion: 1,
      data: { lib_references_v1: [{ id: 'new1' }, { id: 'new2' }] },
    })
    expect(result.ok).toBe(true)
    const after = JSON.parse(localStorage.getItem('lib_references_v1'))
    expect(after).toHaveLength(2)
    expect(after[0].id).toBe('new1')
  })

  it('returns error on invalid', () => {
    const result = restoreWorkspace(null)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('restoreWorkspace — merge mode', () => {
  it('dedupes arrays by id (incoming wins)', () => {
    localStorage.setItem('lib_references_v1', JSON.stringify([
      { id: 'r1', title: 'old1' },
      { id: 'r2', title: 'old2' },
    ]))
    restoreWorkspace({
      appName: 'z-research-tools',
      data: {
        lib_references_v1: [
          { id: 'r2', title: 'updated' },  // overwrites r2
          { id: 'r3', title: 'new' },      // adds r3
        ],
      },
    }, { mode: 'merge' })
    const after = JSON.parse(localStorage.getItem('lib_references_v1'))
    expect(after).toHaveLength(3)
    expect(after.find(r => r.id === 'r2').title).toBe('updated')
    expect(after.find(r => r.id === 'r3').title).toBe('new')
    expect(after.find(r => r.id === 'r1').title).toBe('old1')
  })

  it('merges object maps (e.g. responses)', () => {
    localStorage.setItem('kuesioner_responses', JSON.stringify({
      s1: [{ a: 1 }],
    }))
    restoreWorkspace({
      appName: 'z-research-tools',
      data: {
        kuesioner_responses: {
          s2: [{ b: 2 }],
        },
      },
    }, { mode: 'merge' })
    const after = JSON.parse(localStorage.getItem('kuesioner_responses'))
    expect(after.s1).toBeDefined()
    expect(after.s2).toBeDefined()
  })
})

describe('clearWorkspace', () => {
  it('clears only research keys, preserves auth/wallet', () => {
    localStorage.setItem('lib_references_v1', JSON.stringify([{ id: 'r1' }]))
    localStorage.setItem('kuesioner_surveys', JSON.stringify([{ id: 's1' }]))
    localStorage.setItem('skor_users', JSON.stringify([{ id: 'u1' }]))
    localStorage.setItem('zoya_theme', 'dark')

    const cleared = clearWorkspace()
    expect(cleared).toContain('lib_references_v1')
    expect(cleared).toContain('kuesioner_surveys')
    expect(localStorage.getItem('lib_references_v1')).toBeNull()
    // Auth & theme preserved
    expect(localStorage.getItem('skor_users')).not.toBeNull()
    expect(localStorage.getItem('zoya_theme')).toBe('dark')
  })
})

describe('round-trip export → restore', () => {
  it('preserves all data exactly', () => {
    const surveys = [{ id: 's1', title: 'Survey A', items: [{ id: 'i1', text: 'Q' }] }]
    const refs = [{ id: 'r1', title: 'Paper', authors: [{ family: 'X' }] }]
    const codes = [{ id: 'c1', label: 'theme1', color: '#f00' }]
    localStorage.setItem('kuesioner_surveys', JSON.stringify(surveys))
    localStorage.setItem('lib_references_v1', JSON.stringify(refs))
    localStorage.setItem('qual_codebook_v1', JSON.stringify(codes))

    const exported = exportWorkspace()
    clearWorkspace()
    expect(workspaceStats().surveys).toBe(0)

    const result = restoreWorkspace(exported)
    expect(result.ok).toBe(true)
    expect(JSON.parse(localStorage.getItem('kuesioner_surveys'))).toEqual(surveys)
    expect(JSON.parse(localStorage.getItem('lib_references_v1'))).toEqual(refs)
    expect(JSON.parse(localStorage.getItem('qual_codebook_v1'))).toEqual(codes)
  })
})
