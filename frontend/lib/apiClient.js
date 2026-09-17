const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// Render's free tier answers 429/502/503 while an idle service spins up
// (~20-30s). Retry those transparently so the dashboard rides out a cold
// start instead of surfacing an error on the first click of the day.
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 6000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Server-side helper for calling the backend API with the admin's token.
// Only used from Server Components / Route Handlers, where the httpOnly
// cookie is readable.
export async function apiFetch(path, token, options = {}) {
  let response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(45000),
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        const wrapped = new Error('الخادم لا يستجيب. حاول مرة أخرى بعد قليل.');
        wrapped.status = 503;
        throw wrapped;
      }
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_DELAY_MS);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Backend request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export { BACKEND_URL };
