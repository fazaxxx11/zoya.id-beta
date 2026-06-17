/**
 * File Parser Utility v3
 * Supports: .xlsx, .xls, .csv, .docx, .pdf, .txt
 * With advanced parsing logic
 */
let XLSX = null
let mammoth = null
let pdfjsLib = null

async function ensureDeps() {
  if (!XLSX) XLSX = await import('xlsx')
  if (!mammoth) mammoth = await import('mammoth')
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
  }
}

/**
 * Parse Excel/CSV - Straightforward
 */
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        // FIX: sheet_to_json butuh worksheet OBJECT, bukan string nama sheet.
        // Bug sebelumnya: jsonData selalu [] → semua Excel jatuh ke fallback.
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        if (!jsonData || jsonData.length < 2) {
          resolve([{ id: uid(), name: file.name.replace(/\.[^/.]+$/, ''), answer: 'File kosong atau tidak valid' }])
          return
        }
        
        const headers = jsonData[0] || []
        
        // Find name column
        let nameCol = -1
        const nameKeywords = ['nama', 'name', 'siswa', 'mahasiswa', 'murid', 'peserta', 'student', 'participant']
        
        for (let i = 0; i < headers.length; i++) {
          const h = String(headers[i]).toLowerCase()
          if (nameKeywords.some(k => h.includes(k))) {
            nameCol = i
            break
          }
        }
        
        // If no name column found, assume first column
        if (nameCol === -1) nameCol = 0
        
        const students = []
        
        // Process each row (skip header)
        for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx]
          if (!row || row.length === 0) continue
          
          const name = row[nameCol]
          if (!name || String(name).trim() === '') continue
          
          // Get all other columns as answer
          let answer = ''
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            if (colIdx !== nameCol && row[colIdx]) {
              answer += (answer ? ' | ' : '') + String(row[colIdx])
            }
          }
          
          if (answer.trim()) {
            students.push({
              id: uid(),
              name: String(name).trim(),
              answer: answer.trim().substring(0, 50000)
            })
          }
        }
        
        if (students.length === 0) {
          // Fallback: treat first row as single student
          students.push({
            id: uid(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            answer: JSON.stringify(jsonData.slice(1)).substring(0, 50000)
          })
        }
        
        resolve(students)
      } catch (err) {
        reject(new Error('Gagal membaca Excel: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsBinaryString(file)
  })
}

/**
 * Parse CSV
 */
async function parseCSV(file) {
  return parseExcel(file) // Same logic works for CSV
}

/**
 * Parse Word - Cascade Logic
 */
async function parseWord(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result
        const result = await mammoth.extractRawText({ arrayBuffer })
        const text = result.value
        
        // Run cascade logic
        const students = runCascadeParsing(text)
        
        resolve(students)
      } catch (err) {
        reject(new Error('Gagal membaca Word: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse PDF — pakai pdfjs-dist (bukan pdf-lib).
 * Bug sebelumnya: pdf-lib tidak punya getTextContent() — semua PDF selalu
 * salah dideteksi sebagai "scan". Sekarang pakai pdfjs-dist yang memang
 * dirancang untuk text extraction.
 */
async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      // Matikan font warning yang berisik di console
      verbosity: 0,
    })
    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages

    let fullText = ''
    let hasText = false
    const maxPages = Math.min(numPages, 50) // safety cap

    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          .map(item => (typeof item.str === 'string' ? item.str : ''))
          .join(' ')
        if (pageText.trim().length > 10) hasText = true
        fullText += pageText + '\n\n'
      } catch (e) {
        // Lewati halaman yang gagal di-extract (mungkin halaman gambar/scan)
        console.warn(`[parsePDF] halaman ${i} gagal:`, e.message)
      }
    }

    if (!hasText) {
      return [{
        id: uid(),
        name: '⚠️ PDF Scan Terdeteksi',
        answer: 'File ini terlihat seperti PDF hasil scan/gambar (tidak ada layer teks). Disarankan convert ke Word atau gunakan OCR dulu.',
        isWarning: true,
      }]
    }

    return runCascadeParsing(fullText)
  } catch (err) {
    throw new Error('Gagal membaca PDF: ' + (err?.message || String(err)), { cause: err })
  }
}

/**
 * Parse Text
 */
async function parseText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const students = runCascadeParsing(text)
        resolve(students)
      } catch (err) {
        reject(new Error('Gagal membaca file text: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsText(file)
  })
}

/**
 * Cascade Parsing Logic
 */
function runCascadeParsing(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  // === PASS 1: Explicit Labels ===
  const pass1Result = pass1ExplicitLabels(lines)
  if (pass1Result.length >= 2) {
    return pass1Result
  }
  
  // === PASS 2: Separators ===
  const pass2Result = pass2Separators(lines)
  if (pass2Result.length >= 2) {
    return pass2Result
  }
  
  // === PASS 3: Heuristik Nama ===
  const pass3Result = pass3Heuristik(lines)
  if (pass3Result.length >= 1) {
    return pass3Result
  }
  
  // Fallback: single student
  return [{
    id: uid(),
    name: 'Jawaban 1',
    answer: text.substring(0, 50000),
    confidence: 30,
    method: 'fallback'
  }]
}

/**
 * PASS 1: Cek Label Eksplisit (Nama:, Name:, dll)
 */
function pass1ExplicitLabels(lines) {
  const students = []
  const namePatterns = ['nama:', 'name:', 'siswa:', 'mahasiswa:', 'murid:', 'peserta:']
  
  let currentName = null
  let currentAnswer = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lowerLine = line.toLowerCase()
    
    // Check if line starts with name pattern
    const matchedPattern = namePatterns.find(p => lowerLine.startsWith(p))
    
    if (matchedPattern) {
      // Save previous student if exists
      if (currentName && currentAnswer.length > 0) {
        students.push({
          id: uid(),
          name: currentName,
          answer: currentAnswer.join('\n').substring(0, 50000),
          confidence: 95,
          method: 'explicit-label'
        })
      }
      
      // Extract name after colon
      currentName = line.substring(matchedPattern.length).trim()
      currentName = currentName.replace(/^["']|["']$/g, '').trim() // Remove quotes
      currentAnswer = []
    } else if (currentName) {
      currentAnswer.push(line)
    }
  }
  
  // Save last student
  if (currentName && currentAnswer.length > 0) {
    students.push({
      id: uid(),
      name: currentName,
      answer: currentAnswer.join('\n').substring(0, 50000),
      confidence: 95,
      method: 'explicit-label'
    })
  }
  
  return students
}

/**
 * PASS 2: Cek Separator (===, ---, etc)
 */
function pass2Separators(lines) {
  const students = []
  const separatorPattern = /^([=\-*_#]{3,})/
  
  let currentName = null
  let currentAnswer = []
  let afterSeparator = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (separatorPattern.test(line)) {
      afterSeparator = true
      continue
    }
    
    if (afterSeparator && line.length > 0 && line.length < 50) {
      // This is likely a name
      if (currentName && currentAnswer.length > 0) {
        students.push({
          id: uid(),
          name: currentName,
          answer: currentAnswer.join('\n').substring(0, 50000),
          confidence: 80,
          method: 'separator'
        })
      }
      currentName = line
      currentAnswer = []
      afterSeparator = false
    } else if (currentName) {
      currentAnswer.push(line)
    }
  }
  
  // Save last student
  if (currentName && currentAnswer.length > 0) {
    students.push({
      id: uid(),
      name: currentName,
      answer: currentAnswer.join('\n').substring(0, 50000),
      confidence: 80,
      method: 'separator'
    })
  }
  
  return students
}

/**
 * PASS 3: Heuristik Nama
 */
function pass3Heuristik(lines) {
  const students = []
  const nameCandidates = []
  
  const stopWords = ['yang', 'adalah', 'dengan', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'akan', 'sudah', 'ada', 'tidak', 'jika', 'maka', 'atau', 'tetapi', 'karena', 'untuk', 'oleh', 'pada', 'dalam', 'lebih', 'sangat', 'sekali', 'pula', 'lagi', 'jug']
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.length < 2) continue
    
    // Calculate confidence score
    let score = 0
    const words = line.split(/\s+/)
    
    // Short line (1-4 words) → +30
    if (words.length >= 1 && words.length <= 4) score += 30
    
    // All words capitalized → +25
    const allCaps = words.every(w => w[0] === w[0].toUpperCase())
    if (allCaps) score += 25
    
    // Previous line empty → +20
    if (i === 0 || lines[i-1].trim() === '') score += 20
    
    // Next line is long (>20 words) → +15
    if (i < lines.length - 1 && lines[i+1].split(/\s+/).length > 20) score += 15
    
    // No punctuation → +10
    if (!/[.,;:]/.test(line)) score += 10
    
    // No stop words → +10
    const hasStopWord = stopWords.some(s => line.toLowerCase().includes(s))
    if (!hasStopWord) score += 10
    
    // No numbers → +5
    if (!/\d/.test(line)) score += 5
    
    if (score >= 70) {
      nameCandidates.push({ index: i, name: line, score })
    }
  }
  
  // Group content between name candidates
  for (let i = 0; i < nameCandidates.length; i++) {
    const current = nameCandidates[i]
    const next = nameCandidates[i + 1]
    
    const startIdx = current.index
    const endIdx = next ? next.index : lines.length
    
    const answer = lines.slice(startIdx + 1, endIdx)
      .filter(l => l.trim())
      .join('\n')
    
    if (answer.length > 10) {
      students.push({
        id: uid(),
        name: current.name,
        answer: answer.substring(0, 50000),
        confidence: Math.min(current.score, 95),
        method: 'heuristik'
      })
    }
  }
  
  return students
}

/**
 * Generate unique ID
 */
function uid() {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Main parse function
 */
export async function parseStudentFile(file) {
  await ensureDeps()
  const ext = file.name.split('.').pop().toLowerCase()
  
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseExcel(file)
    case 'csv':
      return parseCSV(file)
    case 'docx':
      return parseWord(file)
    case 'doc':
      throw new Error('Format .doc belum didukung. Silakan convert ke .docx dulu (File → Save As → Word Document).')
    case 'pdf':
      return parsePDF(file)
    case 'txt':
      return parseText(file)
    default:
      throw new Error(`Format file tidak support: .${ext}`)
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedFormats() {
  return [
    { ext: 'xlsx', name: 'Excel', icon: '📊' },
    { ext: 'xls', name: 'Excel Lama', icon: '📊' },
    { ext: 'csv', name: 'CSV', icon: '📋' },
    { ext: 'docx', name: 'Word', icon: '📝' },
    { ext: 'pdf', name: 'PDF', icon: '📄' },
    { ext: 'txt', name: 'Text', icon: '📃' }
  ]
}