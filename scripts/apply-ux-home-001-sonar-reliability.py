#!/usr/bin/env python3
from pathlib import Path

path = Path('assets/js/pages/index-data-controller.js')
source = path.read_text(encoding='utf-8')

replacements = [
    (
        "    var candidate = error && error.code ? error.code : fallback;",
        "    var candidate = error?.code || fallback;"
    ),
    (
        "    if (!list || !list.children) return 0;",
        "    if (!list?.children) return 0;"
    ),
    (
        "      if (!child || child.hidden) return total;",
        "      if (child?.hidden ?? true) return total;"
    ),
    (
        "    if (!region || !region.querySelector) return null;",
        "    if (!region?.querySelector) return null;"
    ),
    (
        "      setRegionState(root, kind, options && options.retry ? 'loading' : 'loading');",
        "      setRegionState(root, kind, 'loading');"
    ),
    (
        "      if (serviceRefreshFlight && serviceRefreshFlight.promise === promise) serviceRefreshFlight = null;",
        "      if (serviceRefreshFlight?.promise === promise) serviceRefreshFlight = null;"
    )
]

for before, after in replacements:
    count = source.count(before)
    if count != 1:
        raise SystemExit(f'expected one occurrence of {before!r}, found {count}')
    source = source.replace(before, after)

before_message = """    if (status) {
      status.textContent = snapshot.freshnessState === 'stale'
        ? 'Não foi possível atualizar estes anúncios. Exibindo a última versão disponível.'
        : (snapshot.errorCode === 'DOKE_HOME_OFFLINE'
          ? 'Você está offline. Conecte-se e tente novamente.'
          : 'Não foi possível carregar estes anúncios.');
    }
"""
after_message = """    if (status) {
      var message = 'Não foi possível carregar estes anúncios.';
      if (snapshot.freshnessState === 'stale') {
        message = 'Não foi possível atualizar estes anúncios. Exibindo a última versão disponível.';
      } else if (snapshot.errorCode === 'DOKE_HOME_OFFLINE') {
        message = 'Você está offline. Conecte-se e tente novamente.';
      }
      status.textContent = message;
    }
"""
if source.count(before_message) != 1:
    raise SystemExit(f'nested feedback message block count: {source.count(before_message)}')
source = source.replace(before_message, after_message)
path.write_text(source, encoding='utf-8')
print('UX-HOME-001 Sonar reliability findings corrected')
