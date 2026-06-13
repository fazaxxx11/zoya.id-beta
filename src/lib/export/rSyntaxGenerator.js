/**
 * rSyntaxGenerator.js — Generate R syntax from statistical analysis results
 * Part of Azezmen (zoya.id-beta) export functionality
 */

export function generateRSyntax(result) {
  const lines = ['# ============================================']
  lines.push(`# Azezmen — ${result.toolName || result.type}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# Sample size: ${result.sampleSize || 'N/A'}`)
  lines.push('# ============================================\n')

  switch (result.type) {
    case 'descriptive':
      lines.push('library(psych)')
      lines.push(`describe(data[, c(${result.stats?.map(s => `"${s.column}"`).join(', ') || '"var1"'})])`)
      break
    
    case 'normality':
      lines.push('library(stats)')
      for (const r of (result.results || [])) {
        lines.push(`shapiro.test(data$"${r.column}")`)
      }
      break
    
    case 'correlation':
      lines.push(result.method === 'spearman' ? '# Spearman' : result.tau !== undefined ? "# Kendall's Tau-b" : '# Pearson')
      lines.push(`cor.test(data$"${result.x}", data$"${result.y}", method = "${result.method === 'spearman' ? 'spearman' : result.tau !== undefined ? 'kendall' : 'pearson'}")`)
      break
    
    case 'ttest':
      if (result.mode === 'independent') {
        lines.push(`t.test(${result.outcome || 'y'} ~ ${result.grouping || 'group'}, data = data, var.equal = TRUE)`)
        lines.push(`# Welch: t.test(${result.outcome || 'y'} ~ ${result.grouping || 'group'}, data = data)`)
      } else if (result.mode === 'paired') {
        lines.push(`t.test(data$"${result.column1}", data$"${result.column2}", paired = TRUE)`)
      } else {
        lines.push(`t.test(data$"${result.column}", mu = ${result.mu0 || 0})`)
      }
      break
    
    case 'anova':
      lines.push(`model <- aov(${result.outcome || 'y'} ~ ${result.grouping || 'group'}, data = data)`)
      lines.push('summary(model)\nTukeyHSD(model)')
      break
    
    case 'regression_simple':
    case 'regression_multiple':
      const xs = result.predictors?.map(p => `"${p}"`).join(' + ') || 'x1'
      lines.push(`model <- lm(${result.outcome || 'y'} ~ ${xs}, data = data)`)
      lines.push('summary(model)\npar(mfrow = c(2,2))\nplot(model)')
      break
    
    case 'chisquare':
      lines.push(`table <- table(data$"${result.var1}", data$"${result.var2}")\nchisq.test(table)`)
      break
    
    case 'mannwhitney':
      lines.push(`wilcox.test(${result.outcome || 'y'} ~ ${result.grouping || 'group'}, data = data)`)
      break
    
    case 'wilcoxon':
      lines.push(`wilcox.test(data$"${result.column1}", data$"${result.column2}", paired = TRUE)`)
      break
    
    case 'kruskal':
      lines.push(`kruskal.test(${result.outcome || 'y'} ~ ${result.grouping || 'group'}, data = data)`)
      break
    
    case 'validity_reliability':
      lines.push('library(psych)')
      lines.push(`alpha(data[, c(${result.items?.map(i => `"${i}"`).join(', ') || '"item1", "item2"'})])`)
      break
    
    case 'ngain':
      lines.push(`pre <- data$"${result.column1}"\npost <- data$"${result.column2}"\nmax_score <- ${result.maxScore || 100}\ngain <- (post - pre) / (max_score - pre)\nmean(gain, na.rm = TRUE)`)
      break
    
    default:
      lines.push(`# R syntax untuk "${result.type}" belum tersedia`)
  }
  
  return lines.join('\n')
}
