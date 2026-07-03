export const runtimeFlags = Object.freeze({
  useMockData: true,
  enableNetworkRequests: false,
  enableDataReadyControllers: false,
  dataProvider: 'mock',
  authProvider: 'mock'
});

export function getRuntimeFlags(overrides = {}) {
  return Object.freeze({
    ...runtimeFlags,
    ...overrides
  });
}

export function isFlagEnabled(flagName, flags = runtimeFlags) {
  return Boolean(flags?.[flagName]);
}
