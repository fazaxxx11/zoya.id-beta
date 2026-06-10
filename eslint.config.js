import js from '@eslint/js';
import react from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';

// Browser globals for src/** (React frontend)
const BROWSER_GLOBALS = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  Blob: 'readonly',
  AbortController: 'readonly',
  performance: 'readonly',
  crypto: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  confirm: 'readonly',
  prompt: 'readonly',
  Worker: 'readonly',
  self: 'readonly',
  Image: 'readonly',
  XMLSerializer: 'readonly',
  ClipboardItem: 'readonly',
  importScripts: 'readonly',
  // Third-party browser globals
  XLSX: 'readonly',
  mammoth: 'readonly',
  pdfjsLib: 'readonly',
};

// Node.js globals for api/**, server.js, scripts/**
const NODE_GLOBALS = {
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  global: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
  AbortController: 'readonly',
};

export default [
  js.configs.recommended,
  // ── Frontend (src/**) ──
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: BROWSER_GLOBALS,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Disable react-hooks/exhaustive-deps — plugin not installed
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  // ── Backend (api/**, server.js, scripts/**) ──
  {
    files: ['api/**/*.{js,jsx}', 'server.js', 'scripts/**/*.{js,jsx}', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: NODE_GLOBALS,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  prettier,
];
