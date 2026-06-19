# 🤖 AI Interpretation — Quick Integration Guide

## ⚡ 3-Minute Setup

### 1. Environment Config (30 seconds)

```bash
# Add to .env.local
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_API_KEY=sk-your-key-here
VITE_AI_MODEL=gpt-4o-mini
```

**For AI1833 (free):**
```bash
VITE_AI_API_URL=https://api.ai1833.com/v1/chat/completions
VITE_AI_API_KEY=your-ai1833-key
VITE_AI_MODEL=claude3.7
```

---

### 2. Integration (2 minutes)

**Add to any result page (e.g., `src/components/statistik/ResultCards.jsx`):**

```jsx
import { useState } from 'react'
import InterpretationPanel from '../InterpretationPanel'

export function NormalityResult({ r }) {
  const [showAI, setShowAI] = useState(false)
  
  return (
    <div>
      {/* Existing result display */}
      <ResultHeader title="Uji Normalitas" />
      <table>...</table>
      
      {/* ADD THIS: AI Interpretation Button */}
      <button 
        onClick={() => setShowAI(true)}
        className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
      >
        🤖 Interpretasi AI
      </button>
      
      {/* ADD THIS: Modal */}
      {showAI && (
        <InterpretationPanel 
          testType="normalitas"
          results={r}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  )
}
```

---

### 3. Test Types Supported

| Test Type | Value for `testType` |
|-----------|---------------------|
| Uji Normalitas | `"normalitas"` |
| Korelasi | `"correlation"` |
| T-Test | `"t-test"` |
| ANOVA | `"anova"` |
| Regresi | `"regression"` |
| Chi-Square | `"chi-square"` |

---

### 4. Fallback Behavior

✅ **No API key?** → System uses template-based interpretations (instant, offline)  
✅ **API fails?** → Automatic fallback to templates after 3 retries  
✅ **Cache hit?** → Instant response from localStorage (7-day expiry)

---

### 5. Interpretation Styles

**Simple Indonesian** (Default)
- Plain language for students
- "Variabel X berpengaruh signifikan..."

**Academic Indonesian**
- Formal thesis language (APA style)
- "Hasil analisis menunjukkan bahwa..."

**English Journal-Ready**
- Publication-ready English
- "Regression analysis revealed that..."

---

## 🎯 Integration Checklist

- [ ] Add env vars to `.env.local`
- [ ] Import `InterpretationPanel` component
- [ ] Add state: `const [showAI, setShowAI] = useState(false)`
- [ ] Add button: `<button onClick={() => setShowAI(true)}>🤖 Interpretasi AI</button>`
- [ ] Add modal: `{showAI && <InterpretationPanel ... />}`
- [ ] Test with real results
- [ ] Verify streaming works
- [ ] Check cache behavior (re-open modal)

---

## 📚 Full Documentation

See `AI_INTERPRETATION_README.md` for:
- API reference
- Custom prompts
- Cache management
- Error handling
- Advanced configuration

---

## 🚀 Next: Roll Out to All Pages

**Priority order:**
1. ✅ Normalitas (pilot)
2. Correlation
3. T-Test
4. ANOVA
5. Regression
6. Chi-Square

**Estimate:** 10 minutes per page = 1 hour total
