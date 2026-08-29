const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// Server-side helper for calling the backend API with the admin's token.
// Only used from Server Components / Route Handlers, where the httpOnly
// cookie is readable.
export async function apiFetch(path, token, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Backend request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export { BACKEND_URL };
