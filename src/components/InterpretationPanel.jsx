/**
 * InterpretationPanel Component
 * UI for displaying AI-generated statistical interpretations
 * with streaming support, multiple styles, and caching
 */

import { useState, useEffect } from 'react';
import { generateInterpretation } from '../services/aiInterpretation';
import { generatePrompt, getFallbackInterpretation, getAvailableStyles } from '../services/interpretationPrompts';
import { getCachedInterpretation, cacheInterpretation } from '../services/interpretationCache';

const InterpretationPanel = ({ testType, results, onClose }) => {
  // State management
  const [selectedStyle, setSelectedStyle] = useState('simple_id');
  const [interpretation, setInterpretation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const styles = getAvailableStyles();

  /**
   * Generate interpretation based on current settings
   */
  const generateInterpretationText = async () => {
    // Reset state
    setInterpretation('');
    setError(null);
    setIsCached(false);
    setUseFallback(false);

    // Check cache first
    const cached = getCachedInterpretation(testType, results, selectedStyle);
    if (cached) {
      setInterpretation(cached.text);
      setIsCached(true);
      return;
    }

    // Generate new interpretation
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const prompt = generatePrompt(testType, results, selectedStyle);
      
      const result = await generateInterpretation({
        testType,
        results,
        style: selectedStyle,
        prompt,
        onStream: (chunk) => {
          // Append streaming chunk to interpretation
          setInterpretation(prev => prev + chunk);
        },
        onComplete: (fullText) => {
          // Save to cache when complete
          cacheInterpretation(testType, results, selectedStyle, fullText);
          setIsStreaming(false);
          setIsLoading(false);
        },
        onError: (err) => {
          console.error('Interpretation generation error:', err);
          setError(err.message);
          setIsStreaming(false);
          setIsLoading(false);
          
          // Use fallback interpretation
          const fallback = getFallbackInterpretation(testType, results, selectedStyle);
          setInterpretation(fallback);
          setUseFallback(true);
        },
      });

      // If generation failed and we don't have text yet, use fallback
      if (!result.success && !interpretation) {
        const fallback = getFallbackInterpretation(testType, results, selectedStyle);
        setInterpretation(fallback);
        setUseFallback(true);
      }
    } catch (err) {
      console.error('Interpretation error:', err);
      setError(err.message);
      setIsLoading(false);
      setIsStreaming(false);
      
      // Use fallback interpretation
      const fallback = getFallbackInterpretation(testType, results, selectedStyle);
      setInterpretation(fallback);
      setUseFallback(true);
    }
  };

  /**
   * Copy interpretation to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(interpretation);
      // Show success toast (assuming toast is available globally)
      if (window.toast) {
        window.toast.success('Interpretasi disalin ke clipboard');
      }
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      if (window.toast) {
        window.toast.error('Gagal menyalin ke clipboard');
      }
    }
  };

  /**
   * Auto-generate interpretation on mount and when style changes
   */
  useEffect(() => {
    generateInterpretationText();
  }, [selectedStyle]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🤖</span>
              <span>Interpretasi AI</span>
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Uji: {testType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200 w-10 h-10 flex items-center justify-center"
            aria-label="Tutup"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Style Selector */}
        <div className="p-6 border-b bg-gradient-to-b from-gray-50 to-white">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Pilih Gaya Interpretasi:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isLoading}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedStyle === style.id
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-semibold text-gray-800">{style.name}</div>
                <div className="text-xs text-gray-600 mt-1">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Interpretation Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-gray-50">
          {/* Loading State */}
          {isLoading && !interpretation && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Menghasilkan interpretasi...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">API Tidak Tersedia</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {error}. Menampilkan interpretasi fallback.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Badges */}
          {interpretation && (
            <div className="flex gap-2 mb-4">
              {isCached && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Dari Cache
                </span>
              )}
              {useFallback && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Template Fallback
                </span>
              )}
              {isStreaming && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Streaming...
                </span>
              )}
            </div>
          )}

          {/* Interpretation Text */}
          {interpretation && (
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {interpretation}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gradient-to-b from-gray-50 to-white rounded-b-xl">
          <div className="text-sm text-gray-600">
            {interpretation && (
              <span>{interpretation.length} karakter</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateInterpretationText}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={copyToClipboard}
              disabled={!interpretation || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 Salin ke Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterpretationPanel;
