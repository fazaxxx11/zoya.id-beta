import { describe, it, expect } from 'vitest';
import { independentTTest } from '../../src/lib/statistics/ttest.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('100-sample validation test', () => {
  it('matches ground truth from Python (Control vs Treatment)', () => {
    // Read test data
    const csv = readFileSync(join(import.meta.dirname, '../../test_small_100.csv'), 'utf8');
    const lines = csv.trim().split('\n');
    const data = lines.slice(1).map(line => {
      const [id, group, score] = line.split(',');
      return { id: parseInt(id), group: group.trim(), score: parseFloat(score) };
    });

    const control = data.filter(r => r.group === 'Control').map(r => r.score);
    const treatment = data.filter(r => r.group === 'Treatment').map(r => r.score);

    // Ground truth from Python
    const expectedControlMean = 50.3940;
    const expectedControlSD = 2.4812;
    const expectedTreatmentMean = 69.9200;
    const expectedTreatmentSD = 1.3999;
    const expectedT = -48.4646;
    const expectedDF = 98;
    const expectedCohensD = -9.6929;

    // Run Azezmen's independent t-test
    const result = independentTTest(control, treatment);

    // Validate: means
    expect(result.group1.mean).toBeCloseTo(expectedControlMean, 2);
    expect(result.group2.mean).toBeCloseTo(expectedTreatmentMean, 2);

    // Validate: SDs (note: property is 'stdDev' not 'sd')
    expect(result.group1.stdDev).toBeCloseTo(expectedControlSD, 2);
    expect(result.group2.stdDev).toBeCloseTo(expectedTreatmentSD, 2);

    // Validate: t-statistic (Student's pooled)
    expect(result.student.t).toBeCloseTo(expectedT, 1);

    // Validate: degrees of freedom
    expect(result.student.df).toBe(expectedDF);

    // Validate: Cohen's d
    expect(result.cohensD).toBeCloseTo(expectedCohensD, 1);

    // Validate: significance
    expect(result.student.pValue).toBeLessThan(0.001);
    expect(result.significant).toBe(true);

    // Note: effectSize interpretation might not be in output
    // Cohen's d validation is sufficient
  });
});
