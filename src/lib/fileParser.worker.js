/**
 * Web Worker untuk pemrosesan file berat
 * Poin #1: Pindahkan komputasi berat ke Web Workers
 */

importScripts(
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.12.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
);

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

self.onmessage = async function(e) {
  const { type, fileData, options } = e.data;
  try {
    let result;
    switch(type) {
      case 'parseExcel': result = await parseExcelWorker(fileData); break;
      case 'parseCSV': result = await parseCSVWorker(fileData); break;
      case 'parsePDF': result = await parsePDFWorker(fileData); break;
      case 'parseWord': result = await parseWordWorker(fileData); break;
      default: throw new Error('Unknown worker type: ' + type);
    }
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

// Helper
function uid() { return Math.random().toString(36).slice(2, 8); }

async function parseExcelWorker(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!jsonData || jsonData.length < 2) return [{ id: uid(), name: 'File', answer: 'File kosong' }];
  const headers = jsonData[0] || [];
  let nameCol = 0;
  for (let i = 0; i < headers.length; i++) {
    if (['nama','name','siswa','mahasiswa'].some(k => String(headers[i]).toLowerCase().includes(k))) { nameCol = i; break; }
  }
  const students = [];
  for (let r = 1; r < jsonData.length; r++) {
    const row = jsonData[r]; if (!row) continue;
    const name = String(row[nameCol] || '').trim(); if (!name) continue;
    let answer = '';
    for (let c = 0; c < row.length; c++) { if (c !== nameCol && row[c]) answer += (answer ? ' | ' : '') + row[c]; }
    if (answer.trim()) students.push({ id: uid(), name, answer: answer.substring(0, 50000) });
  }
  return students;
}

async function parseCSVWorker(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [{ id: uid(), name: 'Data', answer: text.substring(0, 50000) }];
  const headers = lines[0].split(',').map(h => h.trim());
  let nameCol = 0;
  for (let i = 0; i < headers.length; i++) { if (['nama','name'].some(k => headers[i].toLowerCase().includes(k))) { nameCol = i; break; } }
  const students = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    const name = cells[nameCol]; if (!name) continue;
    const answer = cells.filter((_, idx) => idx !== nameCol).join(' | ');
    if (answer) students.push({ id: uid(), name, answer: answer.substring(0, 50000) });
  }
  return students;
}

async function parsePDFWorker(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), verbosity: 0 });
  const pdfDoc = await loadingTask.promise;
  let fullText = '', hasText = false;
  for (let i = 1; i <= Math.min(pdfDoc.numPages, 50); i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || '').join(' ');
      if (pageText.trim().length > 10) hasText = true;
      fullText += pageText + '\n';
    } catch(e) {}
  }
  if (!hasText) return [{ id: uid(), name: 'PDF Scan', answer: 'File PDF hasil scan, gunakan OCR.', isWarning: true }];
  return runCascadeParsing(fullText);
}

async function parseWordWorker(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return runCascadeParsing(result.value);
}

function runCascadeParsing(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const students = [];
  let currentName = null, currentAnswer = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('nama:') || lower.startsWith('name:')) {
      if (currentName && currentAnswer.length > 0) students.push({ id: uid(), name: currentName, answer: currentAnswer.join('\n').substring(0, 50000) });
      currentName = line.split(':')[1]?.trim() || 'Unknown';
      currentAnswer = [];
    } else if (currentName) { currentAnswer.push(line); }
  }
  if (currentName && currentAnswer.length > 0) students.push({ id: uid(), name: currentName, answer: currentAnswer.join('\n').substring(0, 50000) });
  if (students.length === 0) students.push({ id: uid(), name: 'Jawaban 1', answer: text.substring(0, 50000) });
  return students;
}
