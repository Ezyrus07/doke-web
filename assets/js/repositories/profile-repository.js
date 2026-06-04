export function createProfileRepository({ runtime = window.Doke?.services?.profile } = {}) {
  return Object.freeze({
    getProfile: (id) => runtime?.getProfile?.(id) ?? Promise.resolve(null),
    listProfiles: (params) => runtime?.listProfiles?.(params) ?? Promise.resolve([])
  });
}
