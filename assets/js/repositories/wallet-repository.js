export function createWalletRepository({ runtime = window.Doke?.services?.wallet } = {}) {
  return Object.freeze({
    getWallet: () => runtime?.getWallet?.() ?? Promise.resolve(null),
    listTransactions: () => runtime?.listTransactions?.() ?? Promise.resolve([])
  });
}
