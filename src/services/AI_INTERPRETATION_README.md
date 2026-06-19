# AI Interpretation System for Azezmen

Complete AI interpretation system for statistical test results with streaming support, multiple interpretation styles, and intelligent caching.

## 📁 Files Generated

1. **aiInterpretation.js** - API wrapper for OpenAI-compatible endpoints
2. **interpretationPrompts.js** - Prompt templates and fallback interpretations
3. **interpretationCache.js** - localStorage caching layer
4. **InterpretationPanel.jsx** - React UI component

## 🚀 Quick Start

### 1. Environment Configuration

Add to your `.env` file:

```bash
# OpenAI-compatible API configuration
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_API_KEY=your-api-key-here
VITE_AI_MODEL=gpt-4o-mini
```

For AI1833:
```bash
VITE_AI_API_URL=https://api.ai1833.com/v1/chat/completions
VITE_AI_API_KEY=your-ai1833-key
VITE_AI_MODEL=deepseek-chat
```

### 2. Import and Use Component

```jsx
import InterpretationPanel from './components/InterpretationPanel';

function StatisticalTestPage() {
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const handleShowInterpretation = (results) => {
    setTestResults(results);
    setShowInterpretation(true);
  };

  return (
    <div>
      {/* Your test results UI */}
      <button onClick={() => handleShowInterpretation(results)}>
        📊 Interpretasi AI
      </button>

      {/* Interpretation Panel */}
      {showInterpretation && (
        <InterpretationPanel
          testType="Uji Normalitas"
          results={{
            pValue: 0.045,
            statistic: 2.34,
            method: 'Shapiro-Wilk',
            sampleSize: 100,
          }}
          onClose={() => setShowInterpretation(false)}
        />
      )}
    </div>
  );
}
```

## 🎨 Interpretation Styles

### 1. Simple Indonesian (`simple_id`)
- Easy-to-understand explanations
- Minimal statistical jargon
- Suitable for general audience
- 2-3 paragraphs

### 2. Academic Indonesian (`academic_id`)
- Formal academic language
- Statistical terminology
- Suitable for thesis/dissertation
- 3-4 paragraphs with structure

### 3. English Journal-Ready (`english_journal`)
- APA 7th edition style
- Publication-ready
- Effect sizes and confidence intervals
- International journal standards

## 🔧 API Service Usage

### Basic Generation

```javascript
import { generateInterpretation } from './services/aiInterpretation';
import { generatePrompt } from './services/interpretationPrompts';

const results = {
  pValue: 0.023,
  statistic: 3.45,
  df: 98,
};

const prompt = generatePrompt('ttest', results, 'simple_id');

const response = await generateInterpretation({
  testType: 'ttest',
  results: results,
  style: 'simple_id',
  prompt: prompt,
  onStream: (chunk) => console.log(chunk),
  onComplete: (text) => console.log('Done:', text),
  onError: (error) => console.error(error),
});
```

### With Caching

```javascript
import { getCachedInterpretation, cacheInterpretation } from './services/interpretationCache';

// Check cache first
const cached = getCachedInterpretation('ttest', results, 'simple_id');
if (cached) {
  console.log('From cache:', cached.text);
} else {
  // Generate new
  const response = await generateInterpretation({...});
  if (response.success) {
    cacheInterpretation('ttest', results, 'simple_id', response.text);
  }
}
```

## 📊 Supported Test Types

- **normalitas** - Normality tests (Shapiro-Wilk, Kolmogorov-Smirnov)
- **correlation** - Correlation analysis (Pearson, Spearman)
- **ttest** - T-tests (independent, paired)
- **anova** - ANOVA (one-way, two-way)
- **regression** - Linear/multiple regression
- **chisquare** - Chi-square tests

## 🎯 Features

### ✅ Streaming Support
- Real-time text generation
- Progressive UI updates
- Better user experience

### ✅ Intelligent Caching
- localStorage-based caching
- 7-day expiration
- LRU eviction policy
- Automatic cleanup
- Max 100 entries

### ✅ Error Handling
- Automatic fallback templates
- Network error recovery
- API key validation
- Graceful degradation

### ✅ UI Features
- Loading states
- Streaming indicators
- Cache status badges
- Copy to clipboard
- Regenerate option
- Responsive design

## 🛠️ Advanced Configuration

### Runtime Config Update

```javascript
import { updateConfig } from './services/aiInterpretation';

updateConfig({
  apiUrl: 'https://custom-api.com/v1/chat',
  apiKey: 'new-key',
  model: 'gpt-4',
  temperature: 0.5,
  maxTokens: 1500,
});
```

### Test API Connection

```javascript
import { testConnection } from './services/aiInterpretation';

const result = await testConnection();
if (result.success) {
  console.log('API connected');
} else {
  console.error('Connection failed:', result.error);
}
```

### Cache Management

```javascript
import { 
  getCacheStats, 
  clearCache, 
  removeExpiredCache 
} from './services/interpretationCache';

// Get statistics
const stats = getCacheStats();
console.log(`Cache: ${stats.activeEntries} entries, ${stats.totalSizeKB} KB`);

// Clear all cache
const cleared = clearCache();
console.log(`Cleared ${cleared} entries`);

// Remove only expired
const removed = removeExpiredCache();
console.log(`Removed ${removed} expired entries`);
```

## 🔒 Security Notes

1. **API Key Storage**: Use environment variables, never commit keys
2. **HTTPS Only**: Ensure API endpoint uses HTTPS
3. **Rate Limiting**: Implement rate limiting on your backend
4. **Input Validation**: Validate test results before sending

## 🐛 Troubleshooting

### Issue: "API key not configured"
**Solution**: Set `VITE_AI_API_KEY` in `.env` file

### Issue: Streaming not working
**Solution**: Ensure API endpoint supports SSE (Server-Sent Events)

### Issue: Cache not persisting
**Solution**: Check browser localStorage is enabled and not full

### Issue: Fallback always showing
**Solution**: Check API URL and key are correct, test connection

## 📝 Example Results Format

### T-Test Results
```javascript
{
  pValue: 0.045,
  statistic: 2.34,
  df: 98,
  method: 'Independent t-test',
  mean1: 23.5,
  mean2: 20.1,
  effectSize: 0.45,
}
```

### Correlation Results
```javascript
{
  pValue: 0.001,
  statistic: 0.76,
  method: 'Pearson',
  rSquared: 0.58,
  n: 100,
}
```

### ANOVA Results
```javascript
{
  pValue: 0.023,
  statistic: 5.67,
  df1: 2,
  df2: 97,
  method: 'One-way ANOVA',
  etaSquared: 0.12,
}
```

## 🎓 Best Practices

1. **Always check cache first** - Reduces API calls and costs
2. **Use appropriate style** - Match interpretation to audience
3. **Include effect sizes** - Provide complete statistical picture
4. **Test with fallbacks** - Ensure graceful degradation
5. **Monitor cache size** - Clear periodically if needed

## 📦 Dependencies

No additional dependencies required! Uses:
- React (already in project)
- Fetch API (browser native)
- localStorage (browser native)

## 🔄 Future Enhancements

- [ ] Export to PDF/Word
- [ ] Multiple interpretations comparison
- [ ] Custom prompt templates
- [ ] Batch interpretation generation
- [ ] API usage analytics
- [ ] Multi-language support expansion

## 📄 License

Part of Azezmen project by Zoya.id

## 🤝 Support

For issues or questions:
1. Check this README
2. Review inline code comments
3. Test with fallback templates first
4. Contact development team
