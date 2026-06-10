// DeepSeek V3.2 Coder Helper — call General Compute for code generation
// Usage: node api/_lib/deepseek-coder.js "your coding task here"
// Uses centralized provider config

import { getProvider, buildHeaders, buildChatBody } from './ai-providers.js';

async function callDeepSeek(task, files = {}) {
  const provider = getProvider('generalcompute');
  if (!provider) throw new Error('GENERALCOMPUTE_API_KEY not set');

  const fileContext = Object.entries(files)
    .map(([path, content]) => `--- FILE: ${path} ---\n${content}\n--- END: ${path} ---`)
    .join('\n\n');

  const system = `You are an expert full-stack developer. You write clean, production-ready code.
Output ONLY the code changes needed. No explanations unless asked.
For modifications: output the COMPLETE file content (not diffs).
Language: JavaScript/JSX (ES modules). Framework: Vite + React + Tailwind CSS.
Follow existing code style and patterns from the provided files.`;

  const user = fileContext
    ? `TASK: ${task}\n\nEXISTING FILES:\n${fileContext}`
    : `TASK: ${task}`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];

  const headers = buildHeaders(provider);
  const body = buildChatBody(provider, messages, { temperature: 0.2, maxTokens: 8000 });

  const res = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

  return data.choices?.[0]?.message?.content || '';
}

// CLI mode
if (process.argv[1] && process.argv[1].includes('deepseek-coder')) {
  const task = process.argv[2];
  if (!task) {
    console.error('Usage: node deepseek-coder.js "task description"');
    process.exit(1);
  }
  callDeepSeek(task).then(console.log).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { callDeepSeek };
