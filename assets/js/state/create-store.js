export function createStore(initialState = {}) {
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch = {}) {
    const nextState = Object.freeze({
      ...state,
      ...patch
    });

    if (Object.is(nextState, state)) return state;

    const previousState = state;
    state = nextState;
    listeners.forEach((listener) => listener(state, previousState));
    return state;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function reset(nextState = initialState) {
    return setState({ ...nextState });
  }

  return Object.freeze({
    getState,
    setState,
    subscribe,
    reset
  });
}
