export interface RetryOptions {
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (err: unknown) => boolean;
}

export async function withRetry<T> (
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const { attempts = 3, baseDelayMs = 500, maxDelayMs = 5000, shouldRetry } = options || {};
    let lastError: unknown;

    for(let i = 1; i <= attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if(shouldRetry && !shouldRetry(error)) throw error;
            if(i === attempts) break;
            const delay = Math.min(baseDelayMs*2**(i-1), maxDelayMs);
            const jitter = Math.floor(Math.random()*200);
            await new Promise(r => setTimeout(r, delay + jitter));
        }
    }
    throw lastError
}