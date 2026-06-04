export const appConfig = Object.freeze({
  appName: 'Doke',
  environment: 'static',
  apiBaseUrl: '',
  dataSource: 'mock',
  requestTimeoutMs: 12000
});

export function getAppConfig(overrides = {}) {
  return Object.freeze({
    ...appConfig,
    ...overrides
  });
}
