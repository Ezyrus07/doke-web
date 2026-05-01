(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function getWallet() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve(null);
    return Doke.mockData.load('wallet');
  }

  function listTransactions() {
    return getWallet().then(function (wallet) {
      return wallet && Array.isArray(wallet.transactions) ? wallet.transactions : [];
    });
  }

  services.wallet = Object.freeze({
    getWallet: getWallet,
    listTransactions: listTransactions
  });
})();
