import { createHttpClient } from './http-client.js';
import { getRuntimeFlags } from '../config/runtime-flags.js';

export function createApiClient({ httpClient = createHttpClient(), flags = getRuntimeFlags() } = {}) {
  function assertNetworkEnabled() {
    if (!flags.enableNetworkRequests) {
      throw new Error('API real desativada. Configure enableNetworkRequests antes de usar rede.');
    }
  }

  return Object.freeze({
    async get(path, options) {
      assertNetworkEnabled();
      return httpClient.get(path, options);
    },
    async post(path, body, options) {
      assertNetworkEnabled();
      return httpClient.post(path, body, options);
    },
    async put(path, body, options) {
      assertNetworkEnabled();
      return httpClient.put(path, body, options);
    },
    async remove(path, options) {
      assertNetworkEnabled();
      return httpClient.remove(path, options);
    }
  });
}
