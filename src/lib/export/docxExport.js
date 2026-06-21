// src/lib/export/docxExport.js
// DOCX export utility — dynamic import docx (lazy-loaded, ~359KB)

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx'

export async function exportToDOCX(result) {



  const sections = []

  // Helper: Create paragraph
  const para = (text, opts = {}) => {
    const {
      bold = false,
      size = 22,
      color = '000000',
      alignment = AlignmentType.LEFT,
      spacing = { after: 120 },
      heading = null,
    } = opts

    return new Paragraph({
      text,
      alignment,
      spacing,
      heading,
      style: heading ? undefined : 'Normal',
      children: [
        new TextRun({
          text,
          bold,
          size,
          color,
        }),
      ],
    })
  }

  // Helper: Create section title
  const sectionTitle = (text) =>
    para(text.toUpperCase(), {
      bold: true,
      size: 20,
      color: '666666',
      spacing: { before: 240, after: 120 },
    })

  // Helper: Create table
  const createTable = (columns, rows) => {
    const headerCells = columns.map(
      (col) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: col.label,
                  bold: true,
                  size: 20,
                }),
              ],
            }),
          ],
          shading: { fill: 'F5F5F5' },
        })
    )

    const dataRows = rows.map(
      (row) =>
        new TableRow({
          children: columns.map((col) => {
            const raw = row[col.key]
            const txt =
              typeof raw === 'number' && !Number.isInteger(raw)
                ? raw.toFixed(col.digits ?? 3)
                : raw ?? '—'

            return new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(txt), size: 20 })],
                }),
              ],
            })
          }),
        })
    )

    return new Table({
      rows: [new TableRow({ children: headerCells }), ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      },
    })
  }

  // Helper: Create KV grid (as table with 2 columns)
  const createKVGrid = (pairs) => {
    const rows = []
    for (let i = 0; i < pairs.length; i += 2) {
      const left = pairs[i]
      const right = pairs[i + 1]

      const formatVal = (v) => {
        if (v === null || v === undefined) return '—'
        if (typeof v === 'number') {
          if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
          if (Number.isInteger(v)) return String(v)
          return v.toFixed(3)
        }
        return String(v).slice(0, 50)
      }

      rows.push(
        new TableRow({
          children: [
            // Left column
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: left[0].toUpperCase(),
                      size: 18,
                      color: '888888',
                    }),
                  ],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatVal(left[1]),
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            // Right column
            new TableCell({
              children: right
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: right[0].toUpperCase(),
                          size: 18,
                          color: '888888',
                        }),
                      ],
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: formatVal(right[1]),
                          bold: true,
                          size: 22,
                        }),
                      ],
                    }),
                  ]
                : [new Paragraph({ text: '' })],
            }),
          ],
        })
      )
    }

    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
    })
  }

  // Header
  sections.push(
    para('Azezmen · Modul Statistik', {
      size: 18,
      color: '999999',
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    })
  )

  sections.push(
    para(result.toolName || 'Hasil Analisis', {
      bold: true,
      size: 32,
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    })
  )

  sections.push(
    para(
      `${result.sampleSize ?? '—'} sampel · ${result.analyzedAt || new Date().toLocaleString('id-ID')}`,
      {
        size: 18,
        color: '888888',
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }
    )
  )

  // Body per type (same logic as PDF)
  if (result.type === 'descriptive') {
    sections.push(sectionTitle('Statistik Deskriptif'))
    sections.push(
      createTable(
        [
          { key: 'column', label: 'Variabel' },
          { key: 'n', label: 'N' },
          { key: 'mean', label: 'Mean' },
          { key: 'median', label: 'Median' },
          { key: 'stdDev', label: 'SD' },
          { key: 'variance', label: 'Var' },
          { key: 'min', label: 'Min' },
          { key: 'max', label: 'Max' },
        ],
        result.stats
      )
    )
  } else if (result.type === 'normality') {
    sections.push(sectionTitle('Uji Normalitas'))
    sections.push(
      createTable(
        [
          { key: 'column', label: 'Variabel' },
          { key: 'method', label: 'Metode' },
          { key: 'stat', label: 'Statistik' },
          { key: 'pValue', label: 'p-value', digits: 4 },
          { key: 'status', label: 'Status' },
        ],
        result.results.map((row) => ({
          ...row,
          stat: row.W ?? row.D,
          status: row.isNormal ? 'Normal' : 'Tidak Normal',
        }))
      )
    )
  } else if (result.type === 'correlation') {
    sections.push(sectionTitle('Ringkasan'))
    sections.push(
      createKVGrid([
        ['Metode', result.method === 'spearman' ? 'Spearman' : 'Pearson'],
        ['n', result.n],
        ['r / ρ', result.r ?? result.rho],
        ['p-value', result.pValue],
        ['t', result.t],
        ['df', result.df],
        ['Kekuatan', result.strength],
        ['Arah', result.direction],
      ])
    )
  } else if (result.type === 'ttest') {
    sections.push(sectionTitle('Ringkasan'))
    sections.push(
      createKVGrid([
        ['Test', result.test || result.mode],
        ['t', result.t],
        ['df', typeof result.df === 'number' ? result.df.toFixed(2) : result.df],
        ['p-value', result.pValue],
        ["Cohen's d", result.cohensD],
        ['Effect size', result.effectSize],
        ['Signifikan?', result.significant ? 'Ya' : 'Tidak'],
        [
          '95% CI',
          result.ci95 ? `[${result.ci95[0]?.toFixed(3)}, ${result.ci95[1]?.toFixed(3)}]` : '—',
        ],
      ])
    )
    if (result.mode === 'independent' && result.group1) {
      sections.push(sectionTitle('Statistik per Grup'))
      sections.push(
        createTable(
          [
            { key: 'name', label: 'Grup' },
            { key: 'n', label: 'n' },
            { key: 'mean', label: 'Mean' },
            { key: 'sd', label: 'SD' },
          ],
          [
            {
              name: result.groupNames?.[0] ?? 'A',
              n: result.group1.n,
              mean: result.group1.mean,
              sd: result.group1.sd,
            },
            {
              name: result.groupNames?.[1] ?? 'B',
              n: result.group2.n,
              mean: result.group2.mean,
              sd: result.group2.sd,
            },
          ]
        )
      )
    }
  } else if (result.type === 'anova') {
    sections.push(sectionTitle('Ringkasan ANOVA'))
    sections.push(
      createKVGrid([
        ['F', result.F],
        ['df between', result.dfBetween],
        ['df within', result.dfWithin],
        ['p-value', result.pValue],
        ['η² (eta-squared)', result.etaSquared],
        ['ω² (omega-squared)', result.omegaSquared],
        ['Signifikan?', result.significant ? 'Ya' : 'Tidak'],
        ['N total', result.N],
      ])
    )
    if (result.groupStats) {
      sections.push(sectionTitle('Statistik per Grup'))
      sections.push(
        createTable(
          [
            { key: 'label', label: 'Grup' },
            { key: 'n', label: 'n' },
            { key: 'mean', label: 'Mean' },
            { key: 'sd', label: 'SD' },
          ],
          result.groupStats
        )
      )
    }
  } else if (result.type === 'regression_simple') {
    sections.push(sectionTitle('Ringkasan Regresi'))
    sections.push(
      createKVGrid([
        ['R²', result.rSquared],
        ['Adj. R²', result.adjustedR2],
        ['F', result.F],
        ['p (F)', result.pF],
        ['β (standardized)', result.standardizedBeta],
        ['SE estimate', result.standardErrorOfEstimate],
        ['Signifikan?', result.significant ? 'Ya' : 'Tidak'],
        ['N', result.n],
      ])
    )
    sections.push(sectionTitle('Koefisien'))
    sections.push(
      createTable(
        [
          { key: 'name', label: 'Koefisien' },
          { key: 'b', label: 'b' },
          { key: 'se', label: 'SE' },
          { key: 't', label: 't' },
          { key: 'p', label: 'p', digits: 4 },
        ],
        [
          {
            name: 'Intercept (b₀)',
            b: result.intercept,
            se: result.intercept_se,
            t: result.intercept_t,
            p: result.intercept_p,
          },
          {
            name: `Slope (${result.x})`,
            b: result.slope,
            se: result.slope_se,
            t: result.slope_t,
            p: result.slope_p,
          },
        ]
      )
    )
    sections.push(
      para(`Persamaan: ${result.equation}`, {
        size: 20,
        color: '666666',
        spacing: { before: 120, after: 120 },
      })
    )
  } else if (result.type === 'regression_multiple') {
    sections.push(sectionTitle('Ringkasan Regresi Berganda'))
    sections.push(
      createKVGrid([
        ['R²', result.rSquared],
        ['Adj. R²', result.adjustedR2],
        ['F', result.F],
        ['p (F)', result.pF],
        ['SE estimate', result.standardErrorOfEstimate],
        ['N', result.n],
      ])
    )
    sections.push(sectionTitle('Koefisien'))
    sections.push(
      createTable(
        [
          { key: 'name', label: 'Variabel' },
          { key: 'b', label: 'b' },
          { key: 'se', label: 'SE' },
          { key: 't', label: 't' },
          { key: 'p', label: 'p', digits: 4 },
        ],
        result.coefficients
      )
    )
    if (result.vifs?.length) {
      sections.push(sectionTitle('VIF'))
      sections.push(
        createTable(
          [
            { key: 'predictor', label: 'Predictor' },
            { key: 'vif', label: 'VIF' },
          ],
          result.vifs
        )
      )
    }
    sections.push(
      para(`Persamaan: ${result.equation}`, {
        size: 20,
        color: '666666',
        spacing: { before: 120, after: 120 },
      })
    )
  } else if (result.type === 'chisquare') {
    sections.push(sectionTitle('Ringkasan Chi-Square'))
    sections.push(
      createKVGrid([
        ['χ²', result.chi2],
        ['df', result.df],
        ['p-value', result.pValue],
        ['N', result.N],
        ["Cramer's V", result.cramersV],
        ['Effect size', result.effectSizeLabel],
        ['Signifikan?', result.isSignificant ? 'Ya' : 'Tidak'],
        result.phi !== null
          ? ['Phi (φ)', result.phi]
          : ['Asumsi', result.assumptionWarning ? 'Pelanggaran' : 'Terpenuhi'],
      ])
    )
    sections.push(sectionTitle(`Tabel kontingensi: ${result.var1} × ${result.var2}`))
    const cols = [
      { key: '_row', label: result.var1 },
      ...result.colLabels.map((c) => ({ key: c, label: c })),
    ]
    const rows = result.observed.map((row, i) => {
      const obj = { _row: result.rowLabels[i] }
      result.colLabels.forEach((c, j) => {
        obj[c] = row[j]
      })
      return obj
    })
    sections.push(createTable(cols, rows))
  } else if (result.type === 'mannwhitney') {
    sections.push(sectionTitle('Ringkasan Mann-Whitney U'))
    sections.push(
      createKVGrid([
        ['U', result.U],
        ['z', result.z],
        ['p-value', result.pValue],
        ['N total', result.N],
        ['Effect size r', result.effectSize],
        ['Magnitude', result.effectSizeLabel],
        ['Signifikan?', result.isSignificant ? 'Ya' : 'Tidak'],
      ])
    )
    sections.push(sectionTitle('Statistik per Grup'))
    sections.push(
      createTable(
        [
          { key: 'name', label: 'Grup' },
          { key: 'n', label: 'n' },
          { key: 'meanRank', label: 'Mean Rank' },
          { key: 'sumRank', label: 'Sum Rank' },
        ],
        [
          {
            name: result.groupNames[0],
            n: result.n1,
            meanRank: result.meanRank1,
            sumRank: result.R1,
          },
          {
            name: result.groupNames[1],
            n: result.n2,
            meanRank: result.meanRank2,
            sumRank: result.R2,
          },
        ]
      )
    )
  } else if (result.type === 'wilcoxon') {
    sections.push(sectionTitle('Ringkasan Wilcoxon'))
    sections.push(
      createKVGrid([
        ['W', result.W],
        ['z', result.z],
        ['p-value', result.pValue],
        ['N pasangan', result.n],
        ['W+', result.Wpos],
        ['W−', result.Wneg],
        ['Mean diff', result.meanDiff],
        ['Effect size r', result.effectSize],
      ])
    )
  } else if (result.type === 'kruskal') {
    sections.push(sectionTitle('Ringkasan Kruskal-Wallis'))
    sections.push(
      createKVGrid([
        ['H', result.H],
        ['df', result.df],
        ['p-value', result.pValue],
        ['η²', result.etaSquared],
        ['N total', result.N],
        ['k grup', result.k],
        ['Signifikan?', result.isSignificant ? 'Ya' : 'Tidak'],
        ['Magnitude', result.effectSizeLabel],
      ])
    )
    sections.push(sectionTitle('Statistik per Grup'))
    sections.push(
      createTable(
        [
          { key: 'name', label: 'Grup' },
          { key: 'n', label: 'n' },
          { key: 'median', label: 'Median' },
          { key: 'meanRank', label: 'Mean Rank' },
        ],
        result.groupStats
      )
    )
  } else if (result.type === 'validity_reliability') {
    sections.push(sectionTitle("Reliabilitas (Cronbach's α)"))
    sections.push(
      createKVGrid([
        ["Cronbach's α", result.reliability.alpha],
        ['Status', result.reliability.alpha >= 0.7 ? 'Reliabel' : 'Kurang Reliabel'],
        ['k item', result.reliability.k],
        ['n responden', result.reliability.n],
      ])
    )
    sections.push(sectionTitle('Validitas Item'))
    sections.push(
      createTable(
        [
          { key: 'name', label: 'Item' },
          { key: 'r', label: 'r' },
          { key: 'p', label: 'p', digits: 4 },
          { key: 'alphaIfDeleted', label: 'α-if-del' },
          { key: 'verdict', label: 'Verdict' },
        ],
        result.validity.items.map((it, i) => ({
          name: result.items[i],
          r: it.r,
          p: it.pValue,
          alphaIfDeleted: result.reliability.itemStats?.[i]?.alphaIfDeleted,
          verdict: it.verdict,
        }))
      )
    )
  }

  // Interpretation
  const interp = result.interpretation || result.reliability?.interpretation
  if (interp) {
    sections.push(sectionTitle('Interpretasi'))
    sections.push(
      para(interp, {
        size: 22,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    )
  }

  if (result.aiInterpretation) {
    sections.push(sectionTitle('Interpretasi AI (akademik)'))
    sections.push(
      para(result.aiInterpretation, {
        size: 22,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    )
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  })

  // Save
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.tool}_${Date.now()}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
