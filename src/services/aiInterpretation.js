/**
 * AI Interpretation Service
 * OpenAI-compatible API wrapper for streaming statistical interpretations
 * Supports AI1833, OpenAI, and other compatible endpoints
 */

// Default configuration - can be overridden via environment variables
const DEFAULT_CONFIG = {
  apiUrl: import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1/chat/completions',
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * Generate AI interpretation for statistical results
 * @param {Object} params - Request parameters
 * @param {string} params.testType - Type of statistical test (e.g., 'normalitas', 'correlation')
 * @param {Object} params.results - Statistical test results
 * @param {string} params.style - Interpretation style ('simple_id', 'academic_id', 'english_journal')
 * @param {string} params.prompt - Custom prompt template
 * @param {Function} params.onStream - Callback for streaming chunks (chunk) => void
 * @param {Function} params.onComplete - Callback when streaming completes (fullText) => void
 * @param {Function} params.onError - Callback for errors (error) => void
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
export async function generateInterpretation({
  testType,
  results,
  style = 'simple_id',
  prompt,
  onStream = null,
  onComplete = null,
  onError = null,
}) {
  try {
    // Validate required parameters
    if (!testType || !results) {
      throw new Error('testType and results are required');
    }

    if (!prompt) {
      throw new Error('prompt template is required');
    }

    // Check API configuration
    if (!DEFAULT_CONFIG.apiKey) {
      throw new Error('AI API key not configured. Set VITE_AI_API_KEY in environment.');
    }

    // Prepare the request payload
    const requestBody = {
      model: DEFAULT_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a statistical analysis expert assistant. Provide clear, accurate interpretations of statistical test results.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: DEFAULT_CONFIG.temperature,
      max_tokens: DEFAULT_CONFIG.maxTokens,
      stream: true, // Always use streaming for better UX
    };

    // Make the API request
    const response = await fetch(DEFAULT_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_CONFIG.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process all complete lines in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(':')) {
          continue;
        }

        // Parse SSE data
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          
          // Check for stream end
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            
            if (content) {
              fullText += content;
              
              // Call streaming callback
              if (onStream) {
                onStream(content);
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE chunk:', parseError);
          }
        }
      }
    }

    // Call completion callback
    if (onComplete) {
      onComplete(fullText);
    }

    return {
      success: true,
      text: fullText,
    };

  } catch (error) {
    console.error('AI Interpretation Error:', error);
    
    // Call error callback
    if (onError) {
      onError(error);
    }

    return {
      success: false,
      text: '',
      error: error.message,
    };
  }
}

/**
 * Test API connection
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function testConnection() {
  try {
    if (!DEFAULT_CONFIG.apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(DEFAULT_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEFAULT_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_CONFIG.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current configuration (without exposing API key)
 * @returns {Object} - Current config (API key masked)
 */
export function getConfig() {
  return {
    apiUrl: DEFAULT_CONFIG.apiUrl,
    model: DEFAULT_CONFIG.model,
    temperature: DEFAULT_CONFIG.temperature,
    maxTokens: DEFAULT_CONFIG.maxTokens,
    hasApiKey: !!DEFAULT_CONFIG.apiKey,
  };
}

/**
 * Update configuration at runtime
 * @param {Object} newConfig - Partial config to update
 */
export function updateConfig(newConfig) {
  Object.assign(DEFAULT_CONFIG, newConfig);
}
