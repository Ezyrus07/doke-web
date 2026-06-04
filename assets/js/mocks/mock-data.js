export const mockData = Object.freeze({
  listings: [],
  workers: [],
  posts: [],
  orders: [],
  messages: [],
  notifications: [],
  wallet: { balance: 0, transactions: [] },
  profile: null,
  communities: []
});

export function getMockCollection(key) {
  const value = mockData[key];
  return Array.isArray(value) ? [...value] : value;
}

export function getMockItem(key, id) {
  const collection = getMockCollection(key);
  if (!Array.isArray(collection)) return null;
  return collection.find((item) => String(item.id) === String(id)) || null;
}
