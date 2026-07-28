#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise RuntimeError(f'Expected marker missing in {path}: {old[:160]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def replace_between(path, start, end, replacement):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if replacement in text and start not in text:
        return False
    start_index = text.find(start)
    if start_index == -1:
        raise RuntimeError(f'Start marker missing in {path}: {start!r}')
    end_index = text.find(end, start_index)
    if end_index == -1:
        raise RuntimeError(f'End marker missing in {path}: {end!r}')
    file.write_text(text[:start_index] + replacement + text[end_index:], encoding='utf-8')
    return True


changed = []

def patch(path, old, new):
    if replace_once(path, old, new):
        changed.append(path)


def section(path, start, end, replacement):
    if replace_between(path, start, end, replacement):
        changed.append(path)


results = 'assets/js/pages/search-results.js'
patch(
    results,
    "    resultsGrid: queryAny('[data-results-grid]'),\n    resultsEmptyTitle: queryAny('[data-results-empty-title]'),",
    "    resultsGrid: queryAny('[data-results-grid]'),\n    resultsPagination: queryAny('[data-results-pagination]'),\n    resultsLoadMore: queryAny('[data-results-load-more]'),\n    resultsEmptyTitle: queryAny('[data-results-empty-title]'),"
)

section(
    results,
    "  const servicePool = searchData.servicePool || [];",
    "  const getUserMatches = searchData.getUserMatches || (() => []);",
    "  const serverResultsSurface = window.Doke?.searchResultsServerSurface;\n"
)

patch(
    results,
    "    previewController?.abort();\n    previewController = null;\n    closeResultsSearchDropdown();",
    "    previewController?.abort();\n    previewController = null;\n    serverResultsSurface?.cancel?.();\n    closeResultsSearchDropdown();"
)

section(
    results,
    "  const getQueryTokens = (query = '') =>",
    "  const renderActiveChips = (query, filters, count) => {",
    "  const renderActiveChips = (query, filters, count) => {"
)

section(
    results,
    "  const renderEmptySuggestions = (query, filters) => {",
    "  const renderResults = () => {",
    "  const renderResults = () => {"
)

patch(
    results,
    """    const userResults = getUserMatches(query);
    const exactServiceResults = getServiceMatches(query, {
      catégories: filters.categories,
      categories: filters.categories,
      staté: filters.state,
      state: filters.state,
      city: filters.city,
      neighborhood: filters.neighborhood,
      guaranteed: filters.guaranteed,
      emergency: filters.emergency,
      online: filters.online,
      availableToday: filters.availableToday,
      minRating: filters.minRating
    });
    const isUserSearch = filters.searchType === 'users';
""",
    """    const userResults = getUserMatches(query);
    const isUserSearch = filters.searchType === 'users';
"""
)

patch(
    results,
    """    renderRelatedSections(query);

    if (isUserSearch) {
""",
    """    renderRelatedSections(query);

    if (filters.searchType !== 'services') {
      serverResultsSurface?.deactivate?.({
        loadMoreButton: els.resultsLoadMore,
        pagination: els.resultsPagination
      });
    }

    if (isUserSearch) {
"""
)

section(
    results,
    "    const relatedServices = exactServiceResults.length >= 6",
    "  const loadResults = (fresh = false) => {",
    """    if (!serverResultsSurface?.render) {
      const error = new Error('Autoridade canônica de resultados não carregada.');
      error.code = 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE';
      setResultsState('error');
      failResultsHydration(error);
      console.error('[resultados] Autoridade canônica de busca indisponível.', error);
      return Promise.reject(error);
    }

    return serverResultsSurface.render({
      query,
      filters,
      grid: els.resultsGrid,
      loadMoreButton: els.resultsLoadMore,
      pagination: els.resultsPagination,
      count: els.resultsCount,
      title: els.resultsTitle,
      description: els.resultsDescription,
      inlineEmpty: els.resultsInlineEmpty,
      createCard: createServiceCard,
      setResultsState,
      settleHydration: settleResultsHydration,
      failHydration: failResultsHydration,
      refreshPreviews: refreshResultPreviews,
      renderActiveChips
    }).catch((error) => {
      console.error('[resultados] Falha ao consultar a busca canônica.', error);
      return [];
    });
  };

  const loadResults = (fresh = false) => {"
)

patch(
    results,
    """  const loadResults = (fresh = false) => {
    setResultsState('loading');
    return ensurePublicServices(fresh).then(() => {
      renderResults();
    }).catch((error) => {
      failResultsHydration(error);
      console.error('[resultados] Falha ao carregar os anúncios públicos.', error);
    });
  };
""",
    """  const loadResults = (fresh = false) => {
    void fresh;
    setResultsState('loading');
    return Promise.resolve(renderResults()).catch((error) => {
      setResultsState('error');
      failResultsHydration(error);
      console.error('[resultados] Falha ao carregar os resultados.', error);
      return [];
    });
  };
"""
)

patch(results, "    renderResults();\n    return true;", "    loadResults();\n    return true;")
patch(results, "    renderResults();\n    closeMobileFilters();", "    loadResults();\n    closeMobileFilters();")
patch(results, "    renderResults();\n  }, { signal });", "    loadResults();\n  }, { signal });")
patch(results, "      renderResults();\n    }, { signal });", "      loadResults();\n    }, { signal });")

patch(
    results,
    """  const refreshPublicServices = () => { publicServicesPromise = null; loadResults(true); };
  document.addEventListener('doke:service-created', refreshPublicServices, { signal });
""",
    """  els.resultsLoadMore?.addEventListener('click', () => {
    serverResultsSurface?.loadMore?.().catch((error) => {
      console.error('[resultados] Falha ao carregar a próxima página.', error);
    });
  }, { signal });

  const refreshPublicServices = () => { loadResults(true); };
  document.addEventListener('doke:service-created', refreshPublicServices, { signal });
"""
)

html = 'resultados.html'
patch(
    html,
    '                <div class="results-grid doke-grid" data-results-grid data-list data-list-kind="services" hidden></div>\n\n                <section',
    '''                <div class="results-grid doke-grid" data-results-grid data-list data-list-kind="services" hidden></div>
                <div class="results-pagination" data-results-pagination hidden>
                  <button class="doke-btn doke-btn--ghost" type="button" data-results-load-more data-action-state="idle" aria-busy="false">Carregar mais</button>
                </div>

                <section'''
)

patch(
    html,
    '''    <script src="assets/js/components/public-service-card.js?v=20260728-search-a03-v1"></script>
    <script src="assets/js/pages/search-data.js?v=20260505-publications-3up-v2"></script>
''',
    '''    <script src="assets/js/components/public-service-card.js?v=20260728-search-a03-v1"></script>
    <script src="assets/js/repositories/search-repository.js?v=20260728-search-a05-v1"></script>
    <script src="assets/js/services/search-service.js?v=20260728-search-a05-v1"></script>
    <script src="assets/js/pages/search/server-results-surface.js?v=20260728-search-a05-v1"></script>
    <script src="assets/js/pages/search-data.js?v=20260505-publications-3up-v2"></script>
'''
)
patch(
    html,
    '    <script src="assets/js/pages/search-results.js?v=20260718-seller-identity-v1"></script>',
    '    <script src="assets/js/pages/search-results.js?v=20260728-search-a05-v1"></script>'
)
patch(
    html,
    '  <script src="assets/js/services/search-service.js?v=20260501-stage31-domain-services" defer></script>\n',
    ''
)

css = Path('assets/css/pages/search-results.css')
css_text = css.read_text(encoding='utf-8')
if '.results-pagination {' not in css_text:
    css_text += '''

.results-pagination {
  display: flex;
  justify-content: center;
  padding-block: 8px 4px;
}

.results-pagination[hidden],
.results-pagination [data-results-load-more][hidden] {
  display: none;
}

.results-pagination [data-results-load-more] {
  min-width: 168px;
}

.results-pagination [data-results-load-more][aria-busy="true"] {
  cursor: wait;
  opacity: 0.72;
}
'''
    css.write_text(css_text, encoding='utf-8')
    changed.append(str(css))

print('SEARCH-A05 integration applied:')
for path in dict.fromkeys(changed):
    print(f'- {path}')
