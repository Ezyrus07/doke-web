export function createCommunityRepository({ runtime = window.Doke?.services?.community } = {}) {
  return Object.freeze({
    list: (params) => runtime?.listCommunities?.(params) ?? runtime?.list?.(params) ?? Promise.resolve([]),
    getById: (id) => runtime?.getCommunity?.(id) ?? runtime?.getById?.(id) ?? Promise.resolve(null)
  });
}
