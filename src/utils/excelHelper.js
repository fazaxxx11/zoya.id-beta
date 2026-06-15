// src/utils/excelHelper.js
import ExcelJS from 'exceljs'

/**
 * Parse Excel file to 2D array
 * Supports .xlsx (via exceljs) and .xls (via xlsx fallback)
 * @param {ArrayBuffer} arrayBuffer - File buffer from FileReader
 * @param {string} filename - Original filename (used to detect format)
 * @returns {Promise<Array<Array>>} Rows as arrays, first row = headers
 */
export async function parseExcelFile(arrayBuffer, filename = '') {
  // .xls (old format) — exceljs doesn't support, use xlsx fallback
  if (filename.endsWith('.xls') && !filename.endsWith('.xlsx')) {
    return await parseWithXlsx(arrayBuffer)
  }

  // .xlsx (modern format) — try exceljs first
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error('File kosong atau format tidak valid')
    }

    const jsonData = []
    worksheet.eachRow((row) => {
      const values = row.values.slice(1)
      const hasData = values.some(v => v !== null && v !== undefined && v !== '')
      if (!hasData) return

      const normalized = values.map(cell => {
        if (cell === null || cell === undefined) return null
        if (typeof cell === 'object') {
          if (cell.text) return cell.text
          if (cell.result !== undefined) return cell.result
          return String(cell)
        }
        return cell
      })
      jsonData.push(normalized)
    })

    return jsonData
  } catch (exceljsErr) {
    // If exceljs fails, try xlsx as fallback
    console.warn('[excelHelper] exceljs failed, trying xlsx fallback:', exceljsErr.message)
    return await parseWithXlsx(arrayBuffer)
  }
}

/**
 * Fallback parser using xlsx library (for .xls old format)
 */
async function parseWithXlsx(arrayBuffer) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('File tidak memiliki sheet')

  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null })

  if (!jsonData || jsonData.length === 0) {
    throw new Error('File kosong atau format tidak valid')
  }

  return jsonData
}

/**
 * Get column names from first row
 */
export function getColumnNames(data) {
  if (!data || data.length === 0) return []
  return data[0].map((col, i) => {
    if (col === null || col === undefined || col === '') return `Column${i + 1}`
    return String(col)
  })
}

/**
 * Detect if file is Excel format
 */
export function isExcelFile(file) {
  return /\.(xlsx|xls)$/i.test(file.name)
}
