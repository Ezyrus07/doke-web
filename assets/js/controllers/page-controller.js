import { createPageState, pageStatus } from '../state/page-state.js';
import { renderState } from '../renderers/render-state.js';

export function createPageController({ root, load, renderReady, store = createPageState() } = {}) {
  async function start(params = {}) {
    store.setState({ status: pageStatus.LOADING, error: null });
    renderState(root, store.getState(), renderReady);

    try {
      const data = typeof load === 'function' ? await load(params) : null;
      const isEmpty = Array.isArray(data) ? data.length === 0 : !data;
      store.setState({
        status: isEmpty ? pageStatus.EMPTY : pageStatus.READY,
        data,
        items: Array.isArray(data) ? data : [],
        error: null
      });
    } catch (error) {
      store.setState({ status: pageStatus.ERROR, error });
    }

    renderState(root, store.getState(), renderReady);
    return store.getState();
  }

  return Object.freeze({
    start,
    getState: store.getState,
    subscribe: store.subscribe
  });
}
