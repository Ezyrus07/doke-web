export const appConfig = Object.freeze({
  appName: 'Doke',
  environment: 'static',
  apiBaseUrl: '',
  dataProvider: 'mock',
  dataSource: 'mock',
  authProvider: 'mock',
  requestTimeoutMs: 12000
});

export function getAppConfig(overrides = {}) {
  return Object.freeze({
    ...appConfig,
    ...overrides
  });
}
