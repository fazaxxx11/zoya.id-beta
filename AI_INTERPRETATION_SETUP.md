# AI Interpretation System - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Configure Environment Variables

Add to your `.env` file in project root:

```bash
# For OpenAI
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_API_KEY=sk-your-openai-key-here
VITE_AI_MODEL=gpt-4o-mini

# OR for AI1833
VITE_AI_API_URL=https://api.ai1833.com/v1/chat/completions
VITE_AI_API_KEY=your-ai1833-key-here
VITE_AI_MODEL=gpt-4o-mini
```

### Step 2: Import Toast Library

The component expects a global toast system. Check if you have:
```javascript
// In your main App.jsx or index.jsx
import { toast } from './lib/toast';
window.toast = toast; // Make it globally available
```

Based on project structure, toast is available at `src/lib/toast.js`.

### Step 3: Use in Your Test Pages

```jsx
import { useState } from 'react';
import InterpretationPanel from './components/InterpretationPanel';

function YourTestPage() {
  const [showInterpretation, setShowInterpretation] = useState(false);
  
  const testResults = {
    pValue: 0.045,
    statistic: 2.34,
    df: 98,
    // ... other test results
  };

  return (
    <div>
      {/* Your existing UI */}
      
      <button onClick={() => setShowInterpretation(true)}>
        🤖 Interpretasi AI
      </button>

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
```

## 📁 Files Created

### Core Services (3 files)
1. **src/services/aiInterpretation.js** (6.1KB)
   - OpenAI-compatible API wrapper
   - Streaming support
   - Error handling

2. **src/services/interpretationPrompts.js** (12KB)
   - 3 interpretation styles
   - Test-specific prompts
   - Fallback templates

3. **src/services/interpretationCache.js** (8.7KB)
   - localStorage caching
   - 7-day expiration
   - LRU management

### UI Component (1 file)
4. **src/components/InterpretationPanel.jsx** (11KB)
   - Full-featured React component
   - Streaming UI
   - Style selector
   - Copy to clipboard

### Documentation & Examples (2 files)
5. **src/services/AI_INTERPRETATION_README.md** (7.4KB)
   - Complete documentation
   - API reference
   - Best practices

6. **src/examples/InterpretationExample.jsx** (12KB)
   - 5 integration examples
   - Cache management demo
   - Error handling examples

## ✅ Features Implemented

- ✅ OpenAI-compatible API (works with OpenAI, AI1833, etc.)
- ✅ Streaming responses for better UX
- ✅ 3 interpretation styles:
  - Simple Indonesian (for general audience)
  - Academic Indonesian (for thesis/dissertation)
  - English Journal-Ready (for publications)
- ✅ Intelligent caching (localStorage, 7-day expiry)
- ✅ Automatic fallback templates when API fails
- ✅ Error handling with graceful degradation
- ✅ Loading states and progress indicators
- ✅ Copy to clipboard functionality
- ✅ Responsive Tailwind UI
- ✅ Test-specific prompts (normalitas, correlation, t-test, ANOVA, regression, chi-square)

## 🎯 Integration Points

The system integrates seamlessly with existing Azezmen pages:

### Example: Statistik.jsx
```jsx
import InterpretationPanel from '../components/InterpretationPanel';

// Add state
const [showAIInterpretation, setShowAIInterpretation] = useState(false);

// Add button in results section
<button 
  onClick={() => setShowAIInterpretation(true)}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg"
>
  🤖 Interpretasi AI
</button>

// Add modal
{showAIInterpretation && (
  <InterpretationPanel
    testType={selectedTest}
    results={testResults}
    onClose={() => setShowAIInterpretation(false)}
  />
)}
```

## 🔧 Testing

### Test API Connection
```javascript
import { testConnection } from './services/aiInterpretation';

const result = await testConnection();
console.log(result); // {success: true} or {success: false, error: '...'}
```

### View Cache Stats
```javascript
import { getCacheStats } from './services/interpretationCache';

const stats = getCacheStats();
console.log(stats);
// {
//   totalEntries: 15,
//   activeEntries: 12,
//   expiredEntries: 3,
//   totalSizeKB: "45.67",
//   ...
// }
```

## 🐛 Troubleshooting

### Issue: "API key not configured"
**Fix**: Add `VITE_AI_API_KEY` to `.env` file

### Issue: Fallback always showing
**Fix**: Check API URL and key, test connection:
```javascript
import { testConnection, getConfig } from './services/aiInterpretation';

console.log(getConfig()); // Check config
const test = await testConnection(); // Test connection
console.log(test);
```

### Issue: Toast not working
**Fix**: Ensure toast is globally available:
```javascript
// In your main app file
import { toast } from './lib/toast';
window.toast = toast;
```

## 📊 Supported Test Types

- ✅ Normalitas (Shapiro-Wilk, Kolmogorov-Smirnov)
- ✅ Correlation (Pearson, Spearman)
- ✅ T-Test (independent, paired)
- ✅ ANOVA (one-way, two-way)
- ✅ Regression (linear, multiple)
- ✅ Chi-Square

## 🎨 Customization

### Change Model
```javascript
import { updateConfig } from './services/aiInterpretation';

updateConfig({
  model: 'gpt-4',
  temperature: 0.5,
  maxTokens: 1500,
});
```

### Add Custom Prompt
```javascript
import { generateInterpretation } from './services/aiInterpretation';

const customPrompt = `Interpret this test in a specific way: ...`;

await generateInterpretation({
  testType: 'custom',
  results: results,
  style: 'simple_id',
  prompt: customPrompt, // Your custom prompt
  onStream: (chunk) => console.log(chunk),
});
```

## 🔐 Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use HTTPS only** - Ensure API endpoint uses HTTPS
3. **Rotate keys regularly** - Change API keys periodically
4. **Monitor usage** - Track API calls to avoid unexpected costs

## 📝 Next Steps

1. Add `VITE_AI_API_KEY` to your `.env` file
2. Test with `testConnection()` function
3. Add button to your test result pages
4. Try all 3 interpretation styles
5. Monitor cache with `getCacheStats()`

## 🤝 Support

For issues:
1. Check this setup guide
2. Review `AI_INTERPRETATION_README.md` for detailed docs
3. Check `InterpretationExample.jsx` for integration examples
4. Test with fallback mode (no API key) to verify UI works

---

**Created**: June 20, 2026
**Project**: Azezmen (Zoya.id)
**Version**: 1.0.0
