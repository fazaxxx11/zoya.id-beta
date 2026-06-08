import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from './config.js';

const inMemoryStore = new Map();
const FALLBACK_WINDOW_SEC = 60;

async function redisCommand(command) {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return null;
    }

    try {
        const response = await fetch(UPSTASH_REDIS_REST_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        });

        if (!response.ok) {
            throw new Error(`Redis request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Redis error:', error);
        return null;
    }
}

export async function slidingWindow(key, maxRequests, windowSec) {
    const redisKey = `rl:${key}`;
    const now = Math.floor(Date.now() / 1000);
    
    // Try Redis first
    const redisResult = await redisCommand(['INCR', redisKey]);
    
    if (redisResult !== null) {
        if (redisResult === 1) {
            await redisCommand(['EXPIRE', redisKey, windowSec]);
        }
        
        const ttl = await redisCommand(['TTL', redisKey]);
        const remaining = Math.max(0, maxRequests - redisResult);
        const reset = now + (ttl || windowSec);
        
        return {
            success: redisResult <= maxRequests,
            limit: maxRequests,
            remaining,
            reset,
        };
    }
    
    // Fallback to in-memory Map
    const windowStart = now - windowSec;
    const storeKey = `mem:${redisKey}`;
    
    if (!inMemoryStore.has(storeKey)) {
        inMemoryStore.set(storeKey, []);
    }
    
    const timestamps = inMemoryStore.get(storeKey);
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    validTimestamps.push(now);
    
    // Clean up old entries
    while (validTimestamps.length > maxRequests * 2) {
        validTimestamps.shift();
    }
    
    inMemoryStore.set(storeKey, validTimestamps);
    
    // Clean up old keys periodically
    if (Math.random() < 0.01) {
        for (const [key, timestamps] of inMemoryStore.entries()) {
            if (timestamps.length === 0 || timestamps[timestamps.length - 1] < windowStart) {
                inMemoryStore.delete(key);
            }
        }
    }
    
    const requestCount = validTimestamps.length;
    const remaining = Math.max(0, maxRequests - requestCount);
    const reset = now + FALLBACK_WINDOW_SEC;
    
    return {
        success: requestCount <= maxRequests,
        limit: maxRequests,
        remaining,
        reset,
    };
}

export function getRateLimitHeaders(rateLimitResult) {
    return {
        'X-RateLimit-Limit': rateLimitResult.limit,
        'X-RateLimit-Remaining': rateLimitResult.remaining,
        'X-RateLimit-Reset': rateLimitResult.reset,
    };
}