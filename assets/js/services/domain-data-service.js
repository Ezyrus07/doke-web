(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function ok(payload) {
    return Promise.resolve(payload || {});
  }

  function loadPageData(pageName) {
    var services = Doke.services || {};
    switch (String(pageName || '').replace(/\.html$/, '')) {
      case 'index':
        return Promise.all([
          services.search && services.search.featured ? services.search.featured(6) : ok([]),
          services.communities && services.communities.list ? services.communities.list({ city: 'Salvador' }) : ok([]),
          services.notifications && services.notifications.unreadCount ? services.notifications.unreadCount() : ok(0)
        ]).then(function (values) {
          return { services: values[0], communities: values[1], unreadNotifications: values[2] };
        });
      case 'resultados':
        return Promise.all([
          services.search && services.search.fromLocationSearch ? services.search.fromLocationSearch() : ok([]),
          services.profile && services.profile.list ? services.profile.list({ type: 'professional' }) : ok([])
        ]).then(function (values) { return { services: values[0], users: values[1] }; });
      case 'pedidos':
        return Promise.all([
          services.orders && services.orders.list ? services.orders.list({}) : ok([]),
          services.orders && services.orders.summary ? services.orders.summary() : ok({})
        ]).then(function (values) { return { orders: values[0], orderSummary: values[1] }; });
      case 'mensagens':
        return services.messages && services.messages.listConversations
          ? services.messages.listConversations({ userId: 'user_001' }).then(function (messages) { return { messages: messages }; })
          : ok({ messages: [] });
      case 'comunidade':
      case 'comunidade-interna':
        return services.communities && services.communities.list
          ? services.communities.list({ city: 'Salvador' }).then(function (communities) { return { communities: communities }; })
          : ok({ communities: [] });
      case 'perfil':
      case 'configuracoes':
        return services.profile && services.profile.getCurrentProfile
          ? services.profile.getCurrentProfile().then(function (profile) { return { profile: profile }; })
          : ok({ profile: null });
      case 'carteira':
        return Promise.all([
          services.wallet && services.wallet.getWallet ? services.wallet.getWallet() : ok(null),
          services.wallet && services.wallet.listTransactions ? services.wallet.listTransactions() : ok([])
        ]).then(function (values) { return { wallet: values[0], transactions: values[1] }; });
      case 'finalizar-pedido':
        var orderId = '';
        try {
          orderId = new URLSearchParams(window.location.search || '').get('orderId') || '';
        } catch (error) {
          orderId = '';
        }
        return services.orders && services.orders.getById && orderId
          ? services.orders.getById(orderId).then(function (order) { return { order: order }; })
          : ok({ order: null });
      case 'pagamento':
        var paymentOrderId = '';
        try {
          paymentOrderId = new URLSearchParams(window.location.search || '').get('orderId') || '';
        } catch (error) {
          paymentOrderId = '';
        }
        return Promise.all([
          services.orders && services.orders.getById && paymentOrderId ? services.orders.getById(paymentOrderId) : ok(null),
          services.wallet && services.wallet.getWallet ? services.wallet.getWallet() : ok(null)
        ]).then(function (values) { return { order: values[0], wallet: values[1] }; });
      case 'adicionar-cartao':
        return services.wallet && services.wallet.getWallet
          ? services.wallet.getWallet().then(function (wallet) {
              return {
                wallet: wallet,
                paymentMethods: wallet && Array.isArray(wallet.paymentMethods) ? wallet.paymentMethods : [],
                tokenizationProvider: null
              };
            })
          : ok({ wallet: null, paymentMethods: [], tokenizationProvider: null });
      case 'avaliacao':
        var reviewOrderId = '';
        try {
          reviewOrderId = new URLSearchParams(window.location.search || '').get('orderId') || '';
        } catch (error) {
          reviewOrderId = '';
        }
        return Promise.all([
          services.orders && services.orders.getById && reviewOrderId ? services.orders.getById(reviewOrderId) : ok(null),
          ok([]),
          ok(null)
        ]).then(function (values) {
          return { order: values[0], reviews: values[1], service: values[2] };
        });
      case 'notificacoes':
        return services.notifications && services.notifications.list
          ? services.notifications.list({}).then(function (notifications) { return { notifications: notifications }; })
          : ok({ notifications: [] });
      default:
        return ok({});
    }
  }

  Doke.domainData = Object.freeze({
    loadPageData: loadPageData
  });
})();
