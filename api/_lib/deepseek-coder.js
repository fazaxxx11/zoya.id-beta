// DeepSeek V3.2 Coder Helper — call General Compute for code generation
// Usage: node api/_lib/deepseek-coder.js "your coding task here"

const GC_URL = 'https://api.generalcompute.com/v1/chat/completions'
const GC_MODEL = 'deepseek-v3.2'

async function callDeepSeek(task, files = {}) {
  const apiKey = process.env.GENERALCOMPUTE_API_KEY
  if (!apiKey) throw new Error('GENERALCOMPUTE_API_KEY not set')

  const fileContext = Object.entries(files)
    .map(([path, content]) => `--- FILE: ${path} ---\n${content}\n--- END: ${path} ---`)
    .join('\n\n')

  const system = `You are an expert full-stack developer. You write clean, production-ready code.
Output ONLY the code changes needed. No explanations unless asked.
For modifications: output the COMPLETE file content (not diffs).
Language: JavaScript/JSX (ES modules). Framework: Vite + React + Tailwind CSS.
Follow existing code style and patterns from the provided files.`

  const user = fileContext
    ? `TASK: ${task}\n\nEXISTING FILES:\n${fileContext}`
    : `TASK: ${task}`

  const res = await fetch(GC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GC_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)

  return data.choices?.[0]?.message?.content || ''
}

// CLI mode
if (process.argv[1] && process.argv[1].includes('deepseek-coder')) {
  const task = process.argv[2]
  if (!task) {
    console.error('Usage: node deepseek-coder.js "task description"')
    process.exit(1)
  }
  callDeepSeek(task).then(console.log).catch(e => { console.error(e); process.exit(1) })
}

module.exports = { callDeepSeek }
