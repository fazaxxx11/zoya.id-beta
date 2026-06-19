/**
 * Interpretation Prompt Templates
 * Contains prompt templates for different test types and interpretation styles
 */

/**
 * Format results object into a readable string
 * @param {Object} results - Statistical test results
 * @returns {string} - Formatted results
 */
function formatResults(results) {
  return Object.entries(results)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');
}

/**
 * Generate prompt for Simple Indonesian style
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @returns {string} - Generated prompt
 */
function generateSimpleIndonesianPrompt(testType, results) {
  const formattedResults = formatResults(results);
  
  return `Berikan interpretasi sederhana dalam Bahasa Indonesia untuk hasil uji statistik berikut:

Jenis Uji: ${testType}
Hasil:
${formattedResults}

Berikan penjelasan yang:
1. Mudah dipahami oleh orang awam
2. Gunakan bahasa yang simpel dan tidak terlalu teknis
3. Jelaskan apa arti praktis dari hasil ini
4. Panjang 2-3 paragraf
5. Hindari jargon statistik yang rumit

Mulai langsung dengan interpretasi tanpa pendahuluan.`;
}

/**
 * Generate prompt for Academic Indonesian style
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @returns {string} - Generated prompt
 */
function generateAcademicIndonesianPrompt(testType, results) {
  const formattedResults = formatResults(results);
  
  return `Berikan interpretasi akademik dalam Bahasa Indonesia untuk hasil uji statistik berikut:

Jenis Uji: ${testType}
Hasil:
${formattedResults}

Berikan interpretasi yang:
1. Menggunakan bahasa akademik Indonesia yang formal
2. Menyertakan istilah statistik yang tepat
3. Menjelaskan implikasi teoritis dan metodologis
4. Cocok untuk skripsi, tesis, atau jurnal lokal
5. Panjang 3-4 paragraf dengan struktur: hasil → interpretasi → implikasi
6. Menyebutkan asumsi dan limitasi jika relevan

Mulai langsung dengan interpretasi tanpa pendahuluan.`;
}

/**
 * Generate prompt for English Journal-Ready style
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @returns {string} - Generated prompt
 */
function generateEnglishJournalPrompt(testType, results) {
  const formattedResults = formatResults(results);
  
  return `Provide a journal-ready interpretation in English for the following statistical test results:

Test Type: ${testType}
Results:
${formattedResults}

Provide an interpretation that:
1. Uses formal academic English suitable for international journals
2. Follows APA 7th edition reporting standards
3. Reports exact p-values and effect sizes where applicable
4. Discusses statistical and practical significance
5. Is 3-4 paragraphs with structure: results → interpretation → implications
6. Mentions assumptions, limitations, and confidence intervals when relevant
7. Uses precise statistical terminology

Start directly with the interpretation without preamble.`;
}

/**
 * Test-specific context enhancers
 * Adds domain-specific guidance for different statistical tests
 */
const TEST_CONTEXT = {
  normalitas: {
    simple_id: 'Fokus pada apakah data normal atau tidak, dan apa artinya untuk analisis selanjutnya.',
    academic_id: 'Diskusikan asumsi normalitas, implikasi untuk pemilihan uji parametrik vs non-parametrik.',
    english_journal: 'Discuss normality assumption, implications for parametric vs non-parametric tests, and potential transformations.',
  },
  correlation: {
    simple_id: 'Jelaskan kekuatan dan arah hubungan antara dua variabel dengan analogi sederhana.',
    academic_id: 'Analisis kekuatan korelasi, arah hubungan, signifikansi statistik, dan r².',
    english_journal: 'Report correlation coefficient, significance, effect size (r²), and discuss linearity assumptions.',
  },
  ttest: {
    simple_id: 'Jelaskan apakah ada perbedaan signifikan antara dua kelompok dan seberapa besar perbedaannya.',
    academic_id: 'Analisis perbedaan mean, signifikansi, effect size (Cohen\'s d), dan interval kepercayaan.',
    english_journal: 'Report t-statistic, degrees of freedom, p-value, effect size (Cohen\'s d), and confidence intervals.',
  },
  anova: {
    simple_id: 'Jelaskan apakah ada perbedaan di antara beberapa kelompok.',
    academic_id: 'Analisis perbedaan antar kelompok, F-statistic, post-hoc tests jika signifikan, dan eta squared.',
    english_journal: 'Report F-statistic, degrees of freedom, p-value, effect size (η²), and post-hoc comparisons.',
  },
  regression: {
    simple_id: 'Jelaskan bagaimana variabel independen mempengaruhi variabel dependen.',
    academic_id: 'Analisis koefisien regresi, R², adjusted R², signifikansi prediktor, dan asumsi regresi.',
    english_journal: 'Report regression coefficients, standard errors, t-values, R², adjusted R², and model fit statistics.',
  },
  chisquare: {
    simple_id: 'Jelaskan apakah ada hubungan antara dua variabel kategorikal.',
    academic_id: 'Analisis independensi variabel kategorikal, chi-square statistic, dan effect size (Cramér\'s V).',
    english_journal: 'Report chi-square statistic, degrees of freedom, p-value, and effect size (Cramér\'s V or phi).',
  },
};

/**
 * Generate prompt based on test type and style
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @param {string} style - Interpretation style ('simple_id', 'academic_id', 'english_journal')
 * @returns {string} - Generated prompt
 */
export function generatePrompt(testType, results, style = 'simple_id') {
  // Normalize test type (lowercase, remove spaces)
  const normalizedTestType = testType.toLowerCase().replace(/[\s-_]/g, '');
  
  // Get base prompt based on style
  let basePrompt;
  switch (style) {
    case 'simple_id':
      basePrompt = generateSimpleIndonesianPrompt(testType, results);
      break;
    case 'academic_id':
      basePrompt = generateAcademicIndonesianPrompt(testType, results);
      break;
    case 'english_journal':
      basePrompt = generateEnglishJournalPrompt(testType, results);
      break;
    default:
      basePrompt = generateSimpleIndonesianPrompt(testType, results);
  }

  // Add test-specific context if available
  const testContext = TEST_CONTEXT[normalizedTestType];
  if (testContext && testContext[style]) {
    basePrompt += `\n\nKonteks tambahan: ${testContext[style]}`;
  }

  return basePrompt;
}

/**
 * Get fallback interpretation when AI is unavailable
 * @param {string} testType - Type of statistical test
 * @param {Object} results - Statistical test results
 * @param {string} style - Interpretation style
 * @returns {string} - Fallback interpretation
 */
export function getFallbackInterpretation(testType, results, style = 'simple_id') {
  const { pValue, statistic } = results;
  const isSignificant = pValue < 0.05;

  // Fallback templates by style
  const templates = {
    simple_id: {
      significant: `Hasil uji ${testType} menunjukkan hasil yang signifikan secara statistik (p = ${pValue?.toFixed(4)}).

Ini berarti terdapat perbedaan atau hubungan yang cukup kuat dan kemungkinan besar bukan karena kebetulan. Nilai statistik yang diperoleh adalah ${statistic?.toFixed(4)}.

Dalam konteks praktis, hasil ini menunjukkan bahwa temuan Anda memiliki dasar statistik yang kuat dan dapat dipertimbangkan untuk pengambilan keputusan atau analisis lebih lanjut.`,
      notSignificant: `Hasil uji ${testType} menunjukkan hasil yang tidak signifikan secara statistik (p = ${pValue?.toFixed(4)}).

Ini berarti tidak terdapat perbedaan atau hubungan yang cukup kuat secara statistik. Nilai statistik yang diperoleh adalah ${statistic?.toFixed(4)}.

Dalam konteks praktis, hasil ini menunjukkan bahwa temuan Anda mungkin disebabkan oleh variasi acak dalam data, dan perlu kehati-hatian dalam mengambil kesimpulan.`,
    },
    academic_id: {
      significant: `Berdasarkan hasil uji ${testType}, diperoleh nilai statistik sebesar ${statistic?.toFixed(4)} dengan nilai p = ${pValue?.toFixed(4)} (p < 0.05).

Hasil ini menunjukkan bahwa terdapat perbedaan atau hubungan yang signifikan secara statistik pada taraf signifikansi 5%. Temuan ini mengindikasikan bahwa hipotesis nol dapat ditolak.

Implikasi teoritis dari hasil ini perlu dikaji lebih lanjut dengan mempertimbangkan konteks penelitian, ukuran sampel, dan asumsi-asumsi yang mendasari pengujian statistik. Disarankan untuk melaporkan effect size untuk memberikan gambaran tentang magnitude atau besarnya efek yang ditemukan.`,
      notSignificant: `Berdasarkan hasil uji ${testType}, diperoleh nilai statistik sebesar ${statistic?.toFixed(4)} dengan nilai p = ${pValue?.toFixed(4)} (p ≥ 0.05).

Hasil ini menunjukkan bahwa tidak terdapat perbedaan atau hubungan yang signifikan secara statistik pada taraf signifikansi 5%. Temuan ini mengindikasikan bahwa hipotesis nol tidak dapat ditolak.

Perlu dicatat bahwa kegagalan menolak hipotesis nol tidak membuktikan bahwa tidak ada efek sama sekali, melainkan bahwa data yang tersedia tidak memberikan bukti yang cukup kuat untuk menyimpulkan adanya efek. Pertimbangkan power analysis dan ukuran sampel dalam interpretasi hasil ini.`,
    },
    english_journal: {
      significant: `A ${testType} was conducted to examine the relationship/difference in the data. The test yielded a statistic value of ${statistic?.toFixed(4)} with a p-value of ${pValue?.toFixed(4)} (p < .05).

The results indicate a statistically significant effect at the .05 alpha level, suggesting that the null hypothesis can be rejected. These findings provide evidence supporting the presence of a meaningful relationship or difference in the data.

The statistical significance should be interpreted in conjunction with practical significance and effect size measures. Researchers should consider the magnitude of the effect, confidence intervals, and the broader theoretical context when drawing conclusions from these results. Limitations related to sample characteristics and statistical assumptions should be acknowledged.`,
      notSignificant: `A ${testType} was conducted to examine the relationship/difference in the data. The test yielded a statistic value of ${statistic?.toFixed(4)} with a p-value of ${pValue?.toFixed(4)} (p ≥ .05).

The results did not reach statistical significance at the .05 alpha level, indicating that the null hypothesis cannot be rejected. These findings suggest insufficient evidence to conclude a meaningful relationship or difference in the data.

It is important to note that failure to reject the null hypothesis does not prove the absence of an effect, but rather indicates that the available data do not provide strong enough evidence for such a conclusion. Researchers should consider statistical power, sample size, and the possibility of Type II error when interpreting non-significant results. Effect size estimates and confidence intervals may provide additional insights into the magnitude and precision of the observed effects.`,
    },
  };

  // Select appropriate template
  const styleTemplates = templates[style] || templates.simple_id;
  const template = isSignificant ? styleTemplates.significant : styleTemplates.notSignificant;

  return template;
}

/**
 * Get list of available styles with descriptions
 * @returns {Array} - Array of style objects
 */
export function getAvailableStyles() {
  return [
    {
      id: 'simple_id',
      name: 'Sederhana (Indonesia)',
      description: 'Penjelasan mudah dipahami untuk orang awam',
      language: 'id',
    },
    {
      id: 'academic_id',
      name: 'Akademik (Indonesia)',
      description: 'Interpretasi formal untuk skripsi/tesis',
      language: 'id',
    },
    {
      id: 'english_journal',
      name: 'Journal-Ready (English)',
      description: 'Publication-ready interpretation for international journals',
      language: 'en',
    },
  ];
}
