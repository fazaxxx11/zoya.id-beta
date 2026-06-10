// src/lib/export/pdfExport.js
// PDF export utility — dynamic import jsPDF (lazy-loaded, ~722KB)

export async function exportToPDF(result, containerEl) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, pageH = 297
  const mx = 18
  const myTop = 18
  const myBot = 18
  const contentW = pageW - 2 * mx
  const state = { y: myTop }

  const setFont = (size, style = 'normal', color = [40, 40, 40]) => {
    doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color)
  }
  const ensureSpace = (need) => {
    if (state.y + need > pageH - myBot) { doc.addPage(); state.y = myTop }
  }
  const writeText = (text, opts = {}) => {
    const { size = 10, style = 'normal', color = [40, 40, 40], indent = 0, leading = 4.6, align = 'left' } = opts
    setFont(size, style, color)
    const lines = doc.splitTextToSize(String(text ?? '—'), contentW - indent)
    ensureSpace(lines.length * leading)
    if (align === 'center') {
      lines.forEach((line, i) => {
        doc.text(String(line), pageW / 2, state.y + i * leading, { align: 'center' })
      })
    } else {
      doc.text(lines, mx + indent, state.y)
    }
    state.y += lines.length * leading
  }
  const hr = (gap = 3) => {
    ensureSpace(gap + 1)
    doc.setDrawColor(220); doc.setLineWidth(0.2)
    doc.line(mx, state.y, pageW - mx, state.y); state.y += gap
  }
  const sectionTitle = (text) => {
    state.y += 2
    ensureSpace(8)
    setFont(7.5, 'bold', [120, 120, 120])
    doc.text(String(text).toUpperCase(), mx, state.y, { charSpace: 0.4 }); state.y += 5
  }

  const drawTable = (columns, rows, opts = {}) => {
    const { headerBg = [245, 245, 245], rowH = 6, headerH = 7, fontSize = 8.5 } = opts
    const totalDeclaredW = columns.reduce((s, c) => s + (c.width || 0), 0)
    const remaining = contentW - totalDeclaredW
    const flexCols = columns.filter(c => !c.width).length || 1
    const flexW = remaining / flexCols
    const widths = columns.map(c => c.width || flexW)

    const drawHeader = () => {
      doc.setFillColor(...headerBg)
      doc.rect(mx, state.y, contentW, headerH, 'F')
      setFont(fontSize, 'bold', [60, 60, 60])
      let x = mx + 2
      columns.forEach((c, i) => {
        doc.text(c.label, x, state.y + headerH - 2.4)
        x += widths[i]
      })
      state.y += headerH
      doc.setDrawColor(220)
      doc.line(mx, state.y, pageW - mx, state.y)
    }

    ensureSpace(headerH + rowH)
    drawHeader()

    rows.forEach((row, ri) => {
      ensureSpace(rowH)
      if (state.y === myTop) drawHeader()
      if (ri % 2 === 1) {
        doc.setFillColor(252, 252, 252)
        doc.rect(mx, state.y, contentW, rowH, 'F')
      }
      setFont(fontSize, 'normal', [40, 40, 40])
      let x = mx + 2
      columns.forEach((c, i) => {
        const raw = row[c.key]
        const txt = typeof raw === 'number' && !Number.isInteger(raw) ? raw.toFixed(c.digits ?? 3) : (raw ?? '—')
        const truncated = doc.splitTextToSize(String(txt), widths[i] - 2)[0]
        doc.text(String(truncated), x, state.y + rowH - 2)
        x += widths[i]
      })
      state.y += rowH
    })
    doc.setDrawColor(220)
    doc.line(mx, state.y, pageW - mx, state.y)
    state.y += 3
  }

  const drawKVGrid = (pairs) => {
    const colW = contentW / 2
    const rowH = 5.5
    setFont(8.5, 'normal', [40, 40, 40])
    for (let i = 0; i < pairs.length; i += 2) {
      ensureSpace(rowH + 0.5)
      const left = pairs[i], right = pairs[i + 1]
      setFont(7.5, 'normal', [140, 140, 140])
      doc.text(String(left[0]).toUpperCase(), mx, state.y)
      if (right) doc.text(String(right[0]).toUpperCase(), mx + colW, state.y)
      setFont(9.5, 'bold', [40, 40, 40])
      doc.text(formatVal(left[1]), mx, state.y + 4.5)
      if (right) doc.text(formatVal(right[1]), mx + colW, state.y + 4.5)
      state.y += rowH + 4
    }
    state.y += 1
  }

  const formatVal = (v) => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'number') {
      if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
      if (Number.isInteger(v)) return String(v)
      return v.toFixed(3)
    }
    return String(v).slice(0, 30)
  }

  // Header
  setFont(8, 'normal', [150, 150, 150])
  doc.text('Azezmen · Modul Statistik', pageW / 2, state.y, { align: 'center' }); state.y += 5
  setFont(15, 'bold', [30, 30, 30])
  doc.text(result.toolName || 'Hasil Analisis', pageW / 2, state.y, { align: 'center' }); state.y += 5
  setFont(8, 'normal', [120, 120, 120])
  doc.text(`${result.sampleSize ?? '—'} sampel · ${result.analyzedAt || new Date().toLocaleString('id-ID')}`,
           pageW / 2, state.y, { align: 'center' })
  state.y += 4
  hr(4)

  // Per-tool body
  buildPdfBody(result, { drawTable, writeText, sectionTitle, drawKVGrid, ensureSpace, hr })

  // Interpretation
  const interp = result.interpretation || result.reliability?.interpretation
  if (interp) {
    sectionTitle('Interpretasi')
    writeText(interp, { size: 9.5, leading: 4.7, align: 'center' })
    state.y += 3
  }

  if (result.aiInterpretation) {
    sectionTitle('Interpretasi AI (akademik)')
    writeText(result.aiInterpretation, { size: 9.5, leading: 4.7, align: 'center' })
    state.y += 3
  }

  // Charts
  if (containerEl) {
    const allSvgs = Array.from(containerEl.querySelectorAll('svg'))
    const svgs = allSvgs.filter(svg => {
      const rect = svg.getBoundingClientRect()
      const vbW = svg.viewBox?.baseVal?.width || 0
      const vbH = svg.viewBox?.baseVal?.height || 0
      const w = Math.max(rect.width, vbW)
      const h = Math.max(rect.height, vbH)
      if (svg.classList?.contains('lucide')) return false
      if (Array.from(svg.classList || []).some(c => /icon/i.test(c))) return false
      return w >= 200 && h >= 100
    })
    if (svgs.length > 0) {
      sectionTitle('Visualisasi')
      for (const svg of svgs) {
        try {
          const { dataUrl, w, h } = await svgToPng(svg)
          const aspect = h / w
          const targetW = Math.min(contentW, 170)
          const targetH = targetW * aspect
          ensureSpace(targetH + 4)
          doc.addImage(dataUrl, 'PNG', mx, state.y, targetW, targetH)
          state.y += targetH + 5
        } catch (err) {
          console.warn('Skip chart:', err)
        }
      }
    }
  }

  // Footer
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    setFont(7.5, 'normal', [160, 160, 160])
    doc.text(`Halaman ${i} dari ${total}`, pageW / 2, pageH - 8, { align: 'center' })
    doc.text(new Date().toLocaleDateString('id-ID'), pageW - mx, pageH - 8, { align: 'right' })
    doc.text('Azezmen', mx, pageH - 8)
  }

  doc.save(`${result.tool}_${Date.now()}.pdf`)
}

export function buildPdfBody(r, ctx) {
  const { drawTable, writeText, sectionTitle, drawKVGrid } = ctx

  if (r.type === 'descriptive') {
    sectionTitle('Statistik Deskriptif')
    drawTable(
      [
        { key: 'column', label: 'Variabel', width: 32 },
        { key: 'n', label: 'N' },
        { key: 'mean', label: 'Mean' },
        { key: 'median', label: 'Median' },
        { key: 'stdDev', label: 'SD' },
        { key: 'variance', label: 'Var' },
        { key: 'min', label: 'Min' },
        { key: 'max', label: 'Max' },
        { key: 'skewness', label: 'Skew' },
        { key: 'kurtosis', label: 'Kurt' },
      ],
      r.stats
    )
  }

  else if (r.type === 'normality') {
    sectionTitle('Uji Normalitas')
    drawTable(
      [
        { key: 'column', label: 'Variabel', width: 35 },
        { key: 'method', label: 'Metode', width: 35 },
        { key: 'stat', label: 'Statistik' },
        { key: 'pValue', label: 'p-value', digits: 4 },
        { key: 'status', label: 'Status' },
      ],
      r.results.map(row => ({
        ...row,
        stat: row.W ?? row.D,
        status: row.isNormal ? 'Normal' : 'Tidak Normal',
      }))
    )
  }

  else if (r.type === 'correlation') {
    sectionTitle('Ringkasan')
    drawKVGrid([
      ['Metode', r.method === 'spearman' ? 'Spearman' : 'Pearson'],
      ['n', r.n],
      ['r / ρ', r.r ?? r.rho],
      ['p-value', r.pValue],
      ['t', r.t],
      ['df', r.df],
      ['Kekuatan', r.strength],
      ['Arah', r.direction],
    ])
  }

  else if (r.type === 'ttest') {
    sectionTitle('Ringkasan')
    drawKVGrid([
      ['Test', r.test || r.mode],
      ['t', r.t],
      ['df', typeof r.df === 'number' ? r.df.toFixed(2) : r.df],
      ['p-value', r.pValue],
      ['Cohen\u2019s d', r.cohensD],
      ['Effect size', r.effectSize],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['95% CI', r.ci95 ? `[${r.ci95[0]?.toFixed(3)}, ${r.ci95[1]?.toFixed(3)}]` : '—'],
    ])
    if (r.mode === 'independent' && r.group1) {
      sectionTitle('Statistik per Grup')
      drawTable(
        [
          { key: 'name', label: 'Grup', width: 60 },
          { key: 'n', label: 'n' },
          { key: 'mean', label: 'Mean' },
          { key: 'sd', label: 'SD' },
        ],
        [
          { name: r.groupNames?.[0] ?? 'A', n: r.group1.n, mean: r.group1.mean, sd: r.group1.sd },
          { name: r.groupNames?.[1] ?? 'B', n: r.group2.n, mean: r.group2.mean, sd: r.group2.sd },
        ]
      )
    }
  }

  else if (r.type === 'anova') {
    sectionTitle('Ringkasan ANOVA')
    drawKVGrid([
      ['F', r.F],
      ['df between', r.dfBetween],
      ['df within', r.dfWithin],
      ['p-value', r.pValue],
      ['η² (eta-squared)', r.etaSquared],
      ['ω² (omega-squared)', r.omegaSquared],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['N total', r.N],
    ])
    if (r.groupStats) {
      sectionTitle('Statistik per Grup')
      drawTable(
        [
          { key: 'label', label: 'Grup', width: 50 },
          { key: 'n', label: 'n' },
          { key: 'mean', label: 'Mean' },
          { key: 'sd', label: 'SD' },
        ],
        r.groupStats
      )
    }
  }

  else if (r.type === 'regression_simple') {
    sectionTitle('Ringkasan Regresi')
    drawKVGrid([
      ['R²', r.rSquared],
      ['Adj. R²', r.adjustedR2],
      ['F', r.F],
      ['p (F)', r.pF],
      ['β (standardized)', r.standardizedBeta],
      ['SE estimate', r.standardErrorOfEstimate],
      ['Signifikan?', r.significant ? 'Ya' : 'Tidak'],
      ['N', r.n],
    ])
    sectionTitle('Koefisien')
    drawTable(
      [{ key: 'name', label: 'Koefisien', width: 50 }, { key: 'b', label: 'b' },
       { key: 'se', label: 'SE' }, { key: 't', label: 't' }, { key: 'p', label: 'p', digits: 4 }],
      [
        { name: 'Intercept (b₀)', b: r.intercept, se: r.intercept_se, t: r.intercept_t, p: r.intercept_p },
        { name: `Slope (${r.x})`,  b: r.slope,    se: r.slope_se,    t: r.slope_t,    p: r.slope_p },
      ]
    )
    writeText(`Persamaan: ${r.equation}`, { size: 9, style: 'italic' })
  }

  else if (r.type === 'regression_multiple') {
    sectionTitle('Ringkasan Regresi Berganda')
    drawKVGrid([
      ['R²', r.rSquared], ['Adj. R²', r.adjustedR2],
      ['F', r.F], ['p (F)', r.pF],
      ['SE estimate', r.standardErrorOfEstimate], ['N', r.n],
    ])
    sectionTitle('Koefisien')
    drawTable(
      [{ key: 'name', label: 'Variabel', width: 50 }, { key: 'b', label: 'b' },
       { key: 'se', label: 'SE' }, { key: 't', label: 't' }, { key: 'p', label: 'p', digits: 4 }],
      r.coefficients
    )
    if (r.vifs?.length) {
      sectionTitle('VIF')
      drawTable(
        [{ key: 'predictor', label: 'Predictor', width: 80 }, { key: 'vif', label: 'VIF' }],
        r.vifs
      )
    }
    writeText(`Persamaan: ${r.equation}`, { size: 9, style: 'italic' })
  }

  else if (r.type === 'chisquare') {
    sectionTitle('Ringkasan Chi-Square')
    drawKVGrid([
      ['χ²', r.chi2], ['df', r.df],
      ['p-value', r.pValue], ['N', r.N],
      ['Cramer\u2019s V', r.cramersV], ['Effect size', r.effectSizeLabel],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
      r.phi !== null ? ['Phi (φ)', r.phi] : ['Asumsi', r.assumptionWarning ? 'Pelanggaran' : 'Terpenuhi'],
    ])
    sectionTitle(`Tabel kontingensi: ${r.var1} × ${r.var2}`)
    const cols = [{ key: '_row', label: r.var1, width: 30 }, ...r.colLabels.map(c => ({ key: c, label: c }))]
    const rows = r.observed.map((row, i) => {
      const obj = { _row: r.rowLabels[i] }
      r.colLabels.forEach((c, j) => { obj[c] = row[j] })
      return obj
    })
    drawTable(cols, rows)
  }

  else if (r.type === 'mannwhitney') {
    sectionTitle('Ringkasan Mann-Whitney U')
    drawKVGrid([
      ['U', r.U], ['z', r.z],
      ['p-value', r.pValue], ['N total', r.N],
      ['Effect size r', r.effectSize], ['Magnitude', r.effectSizeLabel],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
    ])
    sectionTitle('Statistik per Grup')
    drawTable(
      [{ key: 'name', label: 'Grup', width: 50 }, { key: 'n', label: 'n' },
       { key: 'meanRank', label: 'Mean Rank' }, { key: 'sumRank', label: 'Sum Rank' }],
      [
        { name: r.groupNames[0], n: r.n1, meanRank: r.meanRank1, sumRank: r.R1 },
        { name: r.groupNames[1], n: r.n2, meanRank: r.meanRank2, sumRank: r.R2 },
      ]
    )
  }

  else if (r.type === 'wilcoxon') {
    sectionTitle('Ringkasan Wilcoxon')
    drawKVGrid([
      ['W', r.W], ['z', r.z],
      ['p-value', r.pValue], ['N pasangan', r.n],
      ['W+', r.Wpos], ['W−', r.Wneg],
      ['Mean diff', r.meanDiff], ['Effect size r', r.effectSize],
    ])
  }

  else if (r.type === 'kruskal') {
    sectionTitle('Ringkasan Kruskal-Wallis')
    drawKVGrid([
      ['H', r.H], ['df', r.df],
      ['p-value', r.pValue], ['η²', r.etaSquared],
      ['N total', r.N], ['k grup', r.k],
      ['Signifikan?', r.isSignificant ? 'Ya' : 'Tidak'],
      ['Magnitude', r.effectSizeLabel],
    ])
    sectionTitle('Statistik per Grup')
    drawTable(
      [{ key: 'name', label: 'Grup', width: 50 }, { key: 'n', label: 'n' },
       { key: 'median', label: 'Median' }, { key: 'meanRank', label: 'Mean Rank' }],
      r.groupStats
    )
  }

  else if (r.type === 'validity_reliability') {
    sectionTitle('Reliabilitas (Cronbach\u2019s α)')
    drawKVGrid([
      ['Cronbach\u2019s α', r.reliability.alpha],
      ['Status', r.reliability.alpha >= 0.7 ? 'Reliabel' : 'Kurang Reliabel'],
      ['k item', r.reliability.k],
      ['n responden', r.reliability.n],
    ])
    sectionTitle('Validitas Item')
    drawTable(
      [{ key: 'name', label: 'Item', width: 50 },
       { key: 'r', label: 'r' }, { key: 'p', label: 'p', digits: 4 },
       { key: 'alphaIfDeleted', label: 'α-if-del' },
       { key: 'verdict', label: 'Verdict' }],
      r.validity.items.map((it, i) => ({
        name: r.items[i],
        r: it.r,
        p: it.pValue,
        alphaIfDeleted: r.reliability.itemStats?.[i]?.alphaIfDeleted,
        verdict: it.verdict,
      }))
    )
  }
}

export async function svgToPng(svg) {
  const cloned = svg.cloneNode(true)
  cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const bbox = svg.getBoundingClientRect()
  const w = Math.max(svg.viewBox?.baseVal?.width || bbox.width || 480, 100)
  const h = Math.max(svg.viewBox?.baseVal?.height || bbox.height || 280, 100)

  const xml = new XMLSerializer().serializeToString(cloned)
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)

  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Gagal load SVG sebagai image'))
    img.src = dataUrl
  })

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const cx = canvas.getContext('2d')
  cx.fillStyle = '#fff'
  cx.fillRect(0, 0, canvas.width, canvas.height)
  cx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return { dataUrl: canvas.toDataURL('image/png'), w, h }
}
