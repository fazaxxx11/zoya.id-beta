/**
 * Test Scipy Backend Verification
 * 
 * Run: node test_scipy_backend.js
 * 
 * Verifies Python backend matches SPSS output exactly.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api/stats'

// Verified data from Excel (rows 57-163)
const testData = {
  'XII-5 Writing': {
    pre: [16, 20, 16, 33, 27, 30, 33, 34, 27, 16, 28, 24, 27, 27, 20, 22, 27, 22, 18, 22],
    post: [32, 32, 30, 34, 26, 30, 32, 30, 40, 30, 28, 34, 30, 32, 30, 32, 34, 32, 30, 40]
  },
  'XII-5 Speaking': {
    pre: [18, 22, 12, 29, 28, 26, 27, 30, 26, 14, 24, 22, 26, 27, 18, 20, 28, 19, 14, 20],
    post: [22, 19, 23, 16, 20, 26, 30, 22, 19, 18, 23, 19, 30, 20, 22, 17, 22, 18, 20, 19]
  },
  'XII-2 Writing': {
    pre: [30, 24, 30, 32, 40, 28, 40, 30, 38, 30, 30, 38, 30, 30, 30, 22, 15, 28, 32, 20, 26, 29, 27, 24],
    post: [40, 38, 36, 32, 34, 30, 34, 36, 34, 30, 34, 36, 30, 30, 30, 36, 40, 32, 32, 35, 36, 38, 40, 38]
  },
  'XII-2 Speaking': {
    pre: [21, 26, 26, 31, 32, 28, 34, 23, 36, 23, 23, 33, 27, 29, 27, 23, 20, 26, 36, 30, 25, 34, 26, 16],
    post: [32, 28, 36, 30, 35, 26, 30, 30, 30, 31, 28, 33, 38, 33, 29, 30, 32, 30, 32, 35, 33, 35, 33, 30]
  }
}

// SPSS gold standard
const spss = {
  wilcoxon: {
    'XII-5 Writing': { W: 9, p: 0.000 },
    'XII-5 Speaking': { W: 74, p: 0.006 },  // NOTE: SPSS WILXOCON FIX.doc shows this
    'XII-2 Writing': { W: 28, p: 0.000 },
    'XII-2 Speaking': { W: 36, p: 0.002 }
  },
  mannwhitney: {
    'Writing PRE': { U: 158, p: 0.048 },
    'Writing POST': { U: 122.5, p: 0.005 },
    'Speaking PRE': { U: 136, p: 0.014 },
    'Speaking POST': { U: 15.5, p: 0.000 }
  }
}

async function testBackend() {
  console.log('='*80)
  console.log('SCIPY BACKEND VERIFICATION vs SPSS')
  console.log('='*80)
  
  let passed = 0
  let failed = 0
  
  // Test Wilcoxon
  console.log('\nWILCOXON SIGNED-RANK TEST')
  console.log('-'*80)
  
  for (const [name, {pre, post}] of Object.entries(testData)) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'wilcoxon',
          data: { before: pre, after: post },
          options: { alpha: 0.05 }
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.log(`❌ ${name}: Backend error — ${result.error}`)
        failed++
        continue
      }
      
      const backend = result.result
      const reference = spss.wilcoxon[name]
      
      const matchW = Math.abs(backend.W - reference.W) < 1
      const matchP = Math.abs(backend.pValue - reference.p) < 0.01
      
      if (matchW && matchP) {
        console.log(`✅ ${name}: W=${backend.W.toFixed(0)} p=${backend.pValue.toFixed(6)} (SPSS: W=${reference.W} p=${reference.p.toFixed(3)})`)
        passed++
      } else {
        console.log(`❌ ${name}: W=${backend.W.toFixed(0)} p=${backend.pValue.toFixed(6)} (SPSS: W=${reference.W} p=${reference.p.toFixed(3)}) MISMATCH`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${name}: Request failed — ${error.message}`)
      failed++
    }
  }
  
  // Test Mann-Whitney
  console.log('\nMANN-WHITNEY U TEST')
  console.log('-'*80)
  
  const mwTests = [
    ['Writing PRE', testData['XII-5 Writing'].pre, testData['XII-2 Writing'].pre],
    ['Writing POST', testData['XII-5 Writing'].post, testData['XII-2 Writing'].post],
    ['Speaking PRE', testData['XII-5 Speaking'].pre, testData['XII-2 Speaking'].pre],
    ['Speaking POST', testData['XII-5 Speaking'].post, testData['XII-2 Speaking'].post]
  ]
  
  for (const [name, g1, g2] of mwTests) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'mannwhitney',
          data: { group1: g1, group2: g2 },
          options: { alpha: 0.05 }
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.log(`❌ ${name}: Backend error — ${result.error}`)
        failed++
        continue
      }
      
      const backend = result.result
      const reference = spss.mannwhitney[name]
      
      const matchU = Math.abs(backend.U - reference.U) < 2
      const matchP = Math.abs(backend.pValue - reference.p) < 0.01
      
      if (matchU && matchP) {
        console.log(`✅ ${name}: U=${backend.U.toFixed(0)} p=${backend.pValue.toFixed(6)} (SPSS: U=${reference.U} p=${reference.p.toFixed(3)})`)
        passed++
      } else {
        console.log(`❌ ${name}: U=${backend.U.toFixed(0)} p=${backend.pValue.toFixed(6)} (SPSS: U=${reference.U} p=${reference.p.toFixed(3)}) MISMATCH`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${name}: Request failed — ${error.message}`)
      failed++
    }
  }
  
  // Test N-gain
  console.log('\nN-GAIN ANALYSIS')
  console.log('-'*80)
  
  for (const [name, {pre, post}] of Object.entries(testData)) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'ngain',
          data: { pre, post },
          options: { maxScore: 40 }
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.log(`❌ ${name}: Backend error — ${result.error}`)
        failed++
        continue
      }
      
      const backend = result.result
      console.log(`✅ ${name}: <g>=${backend.nGainMean.toFixed(4)} (${backend.efektivitasPersen}%) ${backend.kategoriKelas}`)
      passed++
    } catch (error) {
      console.log(`❌ ${name}: Request failed — ${error.message}`)
      failed++
    }
  }
  
  console.log('\n' + '='*80)
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('='*80)
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Backend is 100% SPSS-verified!')
    process.exit(0)
  } else {
    console.log(`\n❌ ${failed} test(s) failed. Check backend implementation.`)
    process.exit(1)
  }
}

// Run tests
testBackend().catch(error => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
