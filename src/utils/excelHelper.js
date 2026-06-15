// src/utils/excelHelper.js
import ExcelJS from 'exceljs'

/**
 * Parse Excel file to 2D array
 * @param {ArrayBuffer} arrayBuffer - File buffer from FileReader
 * @returns {Promise<Array<Array>>} Rows as arrays, first row = headers
 */
export async function parseExcelFile(arrayBuffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('File kosong atau format tidak valid')
  }

  const jsonData = []
  worksheet.eachRow((row) => {
    // exceljs row.values[0] is always undefined (1-indexed), skip it
    const values = row.values.slice(1)

    // Skip rows that are entirely empty
    const hasData = values.some(v => v !== null && v !== undefined && v !== '')
    if (!hasData) return

    // Normalize cell values — exceljs may return rich text objects
    const normalized = values.map(cell => {
      if (cell === null || cell === undefined) return null
      if (typeof cell === 'object') {
        // Rich text { text: '...' } or hyperlink { text: '...' }
        if (cell.text) return cell.text
        if (cell.result !== undefined) return cell.result // formula cached value
        return String(cell)
      }
      return cell
    })

    jsonData.push(normalized)
  })

  return jsonData
}

/**
 * Get column names from first row
 * @param {Array} data - 2D array from parseExcelFile
 * @returns {Array<string>} Column names
 */
export function getColumnNames(data) {
  if (!data || data.length === 0) return []
  return data[0].map((col, i) => {
    if (col === null || col === undefined || col === '') return `Column${i + 1}`
    return String(col)
  })
}

/**
 * Detect if file is Excel format (not CSV)
 * @param {File} file - File object
 * @returns {boolean}
 */
export function isExcelFile(file) {
  return /\.(xlsx|xls)$/i.test(file.name)
}
