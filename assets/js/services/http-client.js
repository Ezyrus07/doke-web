import { appConfig } from '../config/app-config.js';

export function createHttpClient({ baseUrl = appConfig.apiBaseUrl, fetcher = window.fetch, timeoutMs = appConfig.requestTimeoutMs } = {}) {
  async function request(path, options = {}) {
    if (!baseUrl) {
      throw new Error('HTTP client sem baseUrl. Use mocks/adapters até conectar API real.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(`${baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response.status === 204 ? null : response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return Object.freeze({
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    remove: (path, options) => request(path, { ...options, method: 'DELETE' })
  });
}
