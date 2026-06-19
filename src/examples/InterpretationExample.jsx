/**
 * Integration Example for AI Interpretation System
 * Demonstrates how to integrate InterpretationPanel into existing test pages
 */

import { useState } from 'react';
import InterpretationPanel from '../components/InterpretationPanel';

/**
 * Example 1: Basic Integration
 */
export function BasicExample() {
  const [showInterpretation, setShowInterpretation] = useState(false);

  const testResults = {
    pValue: 0.045,
    statistic: 2.34,
    df: 98,
    method: 'Independent t-test',
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">T-Test Results</h2>
      
      {/* Your existing results display */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <p>p-value: {testResults.pValue}</p>
        <p>t-statistic: {testResults.statistic}</p>
        <p>Degrees of freedom: {testResults.df}</p>
      </div>

      {/* AI Interpretation Button */}
      <button
        onClick={() => setShowInterpretation(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🤖 Interpretasi AI
      </button>

      {/* Interpretation Panel Modal */}
      {showInterpretation && (
        <InterpretationPanel
          testType="T-Test"
          results={testResults}
          onClose={() => setShowInterpretation(false)}
        />
      )}
    </div>
  );
}

/**
 * Example 2: Multiple Test Types
 */
export function MultipleTestsExample() {
  const [activeTest, setActiveTest] = useState(null);

  const tests = [
    {
      id: 'normalitas',
      name: 'Uji Normalitas',
      results: {
        pValue: 0.089,
        statistic: 0.967,
        method: 'Shapiro-Wilk',
        n: 100,
      },
    },
    {
      id: 'correlation',
      name: 'Korelasi Pearson',
      results: {
        pValue: 0.001,
        statistic: 0.76,
        method: 'Pearson',
        rSquared: 0.58,
        n: 100,
      },
    },
    {
      id: 'anova',
      name: 'ANOVA',
      results: {
        pValue: 0.023,
        statistic: 5.67,
        df1: 2,
        df2: 97,
        method: 'One-way ANOVA',
        etaSquared: 0.12,
      },
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Statistical Tests Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tests.map((test) => (
          <div key={test.id} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-2">{test.name}</h3>
            <p className="text-sm text-gray-600 mb-3">
              p = {test.results.pValue?.toFixed(4)}
            </p>
            <button
              onClick={() => setActiveTest(test)}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Lihat Interpretasi
            </button>
          </div>
        ))}
      </div>

      {activeTest && (
        <InterpretationPanel
          testType={activeTest.name}
          results={activeTest.results}
          onClose={() => setActiveTest(null)}
        />
      )}
    </div>
  );
}

/**
 * Example 3: Programmatic API Usage
 */
export function ProgrammaticExample() {
  const [interpretation, setInterpretation] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const generateWithAPI = async () => {
    setLoading(true);
    setStreamingText('');
    setInterpretation('');

    const { generateInterpretation } = await import('../services/aiInterpretation');
    const { generatePrompt } = await import('../services/interpretationPrompts');

    const results = {
      pValue: 0.045,
      statistic: 2.34,
      df: 98,
    };

    const prompt = generatePrompt('ttest', results, 'simple_id');

    await generateInterpretation({
      testType: 'ttest',
      results,
      style: 'simple_id',
      prompt,
      onStream: (chunk) => {
        setStreamingText(prev => prev + chunk);
      },
      onComplete: (fullText) => {
        setInterpretation(fullText);
        setLoading(false);
      },
      onError: (error) => {
        console.error(error);
        setLoading(false);
      },
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Programmatic API Usage</h2>
      
      <button
        onClick={generateWithAPI}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Interpretation'}
      </button>

      {streamingText && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <h3 className="font-bold mb-2">Streaming Output:</h3>
          <div className="whitespace-pre-wrap text-sm">
            {streamingText}
            {loading && <span className="animate-pulse">▊</span>}
          </div>
        </div>
      )}

      {interpretation && !loading && (
        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-bold mb-2 text-blue-800">Final Result:</h3>
          <p className="text-sm text-gray-700">{interpretation.length} characters</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Cache Management
 */
export function CacheManagementExample() {
  const [stats, setStats] = useState(null);

  const loadCacheStats = async () => {
    const { getCacheStats } = await import('../services/interpretationCache');
    const cacheStats = getCacheStats();
    setStats(cacheStats);
  };

  const clearAllCache = async () => {
    const { clearCache } = await import('../services/interpretationCache');
    const cleared = clearCache();
    alert(`Cleared ${cleared} cache entries`);
    loadCacheStats();
  };

  const removeExpired = async () => {
    const { removeExpiredCache } = await import('../services/interpretationCache');
    const removed = removeExpiredCache();
    alert(`Removed ${removed} expired entries`);
    loadCacheStats();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Cache Management</h2>
      
      <div className="space-y-3 mb-6">
        <button
          onClick={loadCacheStats}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Load Cache Stats
        </button>
        <button
          onClick={removeExpired}
          className="ml-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Remove Expired
        </button>
        <button
          onClick={clearAllCache}
          className="ml-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear All Cache
        </button>
      </div>

      {stats && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-3">Cache Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold">{stats.totalEntries}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Entries</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeEntries}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expired Entries</p>
              <p className="text-2xl font-bold text-red-600">{stats.expiredEntries}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Size</p>
              <p className="text-2xl font-bold">{stats.totalSizeKB} KB</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">Configuration</p>
            <p className="text-sm">Max Entries: {stats.maxEntries}</p>
            <p className="text-sm">Expiry: {stats.expiryDays} days</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Error Handling
 */
export function ErrorHandlingExample() {
  const [showPanel, setShowPanel] = useState(false);
  const [useInvalidKey, setUseInvalidKey] = useState(false);

  const testWithInvalidKey = async () => {
    if (useInvalidKey) {
      const { updateConfig } = await import('../services/aiInterpretation');
      updateConfig({ apiKey: 'invalid-key-test' });
    }
    setShowPanel(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Error Handling Demo</h2>
      
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useInvalidKey}
            onChange={(e) => setUseInvalidKey(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">Simulate API error (use invalid key)</span>
        </label>
      </div>

      <button
        onClick={testWithInvalidKey}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Test Error Handling
      </button>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> When API fails, the system automatically falls back to 
          template-based interpretations. Users still get useful results even without AI.
        </p>
      </div>

      {showPanel && (
        <InterpretationPanel
          testType="Error Test"
          results={{ pValue: 0.045, statistic: 2.34 }}
          onClose={() => {
            setShowPanel(false);
            setUseInvalidKey(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Full Integration Example Component
 */
export default function InterpretationExamples() {
  const [activeExample, setActiveExample] = useState('basic');

  const examples = [
    { id: 'basic', name: 'Basic Integration', component: BasicExample },
    { id: 'multiple', name: 'Multiple Tests', component: MultipleTestsExample },
    { id: 'programmatic', name: 'Programmatic API', component: ProgrammaticExample },
    { id: 'cache', name: 'Cache Management', component: CacheManagementExample },
    { id: 'errors', name: 'Error Handling', component: ErrorHandlingExample },
  ];

  const ActiveComponent = examples.find(e => e.id === activeExample)?.component || BasicExample;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">AI Interpretation - Integration Examples</h1>
        
        {/* Example Selector */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {examples.map(example => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded ${
                activeExample === example.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>

        {/* Active Example */}
        <div className="bg-white rounded-lg shadow-lg">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
