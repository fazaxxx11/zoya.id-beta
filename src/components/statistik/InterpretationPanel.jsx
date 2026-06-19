import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Copy, Check } from 'lucide-react';

const InterpretationPanel = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState('simple');
  const [interpretation, setInterpretation] = useState({ simple: '', academic: '', english: '' });
  const [loading, setLoading] = useState({ simple: false, academic: false, english: false });
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);

  // Fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Load interpretation for active tab
  useEffect(() => {
    if (!interpretation[activeTab] && !loading[activeTab]) {
      loadInterpretation(activeTab);
    }
  }, [activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  // Smooth close animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const loadInterpretation = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, type })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        accumulated += chunk;
        setInterpretation(prev => ({ ...prev, [type]: accumulated }));
      }
    } catch (error) {
      console.error('Failed to load interpretation:', error);
      setInterpretation(prev => ({ 
        ...prev, 
        [type]: 'Gagal memuat interpretasi. Silakan coba lagi.' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(interpretation[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'simple', label: 'Sederhana' },
    { id: 'academic', label: 'Akademik' },
    { id: 'english', label: 'English' }
  ];

  return (
    <>
      {/* Backdrop with fade-in */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      >
        {/* Modal container with fade-in and scale */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div
            ref={modalRef}
            className={`w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh] transition-all duration-300 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {/* Header with gradient */}
            <div className="relative px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Interpretasi AI
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150 group"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
                </button>
              </div>
            </div>

            {/* Tabs with slide indicator */}
            <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-2 font-medium rounded-t-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-200" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content area with scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading[activeTab] ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                      style={{ width: `${Math.random() * 30 + 70}%` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {interpretation[activeTab] || 'Memuat interpretasi...'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCopy}
                  disabled={!interpretation[activeTab] || loading[activeTab]}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm hover:shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 hover:scale-105"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InterpretationPanel;
