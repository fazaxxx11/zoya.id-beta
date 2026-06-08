export async function callAIWithTimeout(url, options = {}, timeoutMs = 30000) {
    const maxRetries = 1;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            lastError = error;

            if (error.name === 'AbortError') {
                if (attempt < maxRetries) {
                    console.warn(`AI call timeout, retrying (${attempt + 1}/${maxRetries})...`);
                    continue;
                }
                throw new Error(`AI call timed out after ${timeoutMs}ms`);
            }

            if (attempt < maxRetries && error.message?.includes('fetch failed')) {
                console.warn(`AI call failed, retrying (${attempt + 1}/${maxRetries})...`);
                continue;
            }

            throw new Error(`AI call failed: ${error.message}`);
        }
    }

    throw lastError;
}