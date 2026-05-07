/* Doke pedidos — state store.
   Responsibility: hold current orders, filter and visible collection. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  const listeners = new Set();

  const state = {
    orders: [],
    classifiedOrders: [],
    filter: 'all',
    selectedIds: new Set()
  };

  const emit = () => {
    const snapshot = ns.state.getState();
    listeners.forEach((listener) => listener(snapshot));
  };

  const matchesFilter = (order, filter) => {
    if (filter === 'all') return true;
    if (filter === 'action') return order.requiresAction;
    if (filter === 'risk') return order.atRisk;
    if (filter === 'open') return order.openBudget;
    return order.status === filter;
  };

  const recompute = () => {
    const intelligence = ns.intelligence;
    state.classifiedOrders = state.orders
      .map((order) => intelligence.classifyOrder(order))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  };

  const setOrders = (orders) => {
    state.orders = Array.isArray(orders) ? orders : [];
    recompute();
    emit();
  };

  const setFilter = (filter = 'all') => {
    state.filter = filter;
    emit();
  };

  const getVisibleOrders = () => state.classifiedOrders.filter((order) => matchesFilter(order, state.filter));

  const getState = () => ({
    orders: [...state.orders],
    classifiedOrders: [...state.classifiedOrders],
    visibleOrders: getVisibleOrders(),
    filter: state.filter,
    selectedIds: new Set(state.selectedIds)
  });

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  ns.state = Object.freeze({
    setOrders,
    setFilter,
    getState,
    getVisibleOrders,
    matchesFilter,
    subscribe
  });
})();
