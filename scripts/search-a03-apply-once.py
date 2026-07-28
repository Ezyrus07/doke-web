#!/usr/bin/env python3
from pathlib import Path
import traceback

DIAGNOSTIC = Path('docs/validation/SEARCH-A03-APPLY-DIAGNOSTIC.txt')


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise RuntimeError(f'Expected marker missing in {path}: {old[:160]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def apply():
    changed = []
    def patch(path, old, new):
        if replace_once(path, old, new): changed.append(path)

    patch('assets/js/components/public-service-card.js',
      "var favorite=document.createElement('button'); favorite.className='doke-ad-card__favorite doke-icon-btn doke-icon-btn--soft'; favorite.type='button'; favorite.setAttribute('aria-label','Salvar anúncio'); favorite.appendChild(svg('M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 1 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2Z')); media.appendChild(favorite);",
      "var favorite=document.createElement('button'); favorite.className='doke-ad-card__favorite doke-icon-btn doke-icon-btn--soft'; favorite.type='button'; favorite.dataset.serviceFavorite = ''; if (service.id) favorite.dataset.favoriteServiceId = service.id; favorite.setAttribute('aria-pressed', 'false'); favorite.setAttribute('aria-label','Salvar anúncio'); favorite.appendChild(svg('M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 1 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2Z')); media.appendChild(favorite);")

    patch('assets/js/components/ad-card-interactions.js',
      ' * - Favorite -> local visual toggle only.',
      ' * - Favorite -> Canonical favorite controller backed by the favorites service.')
    patch('assets/js/components/ad-card-interactions.js',
      "  const toggleFavorite = (button) => {\n    const isActive = !button.classList.contains('is-active');\n    button.classList.toggle('is-active', isActive);\n    button.setAttribute('aria-pressed', String(isActive));\n    button.setAttribute('aria-label', isActive ? 'Remover anúncio dos salvos' : 'Salvar anúncio');\n  };",
      "  const toggleFavorite = (button) => {\n    const controller = window.Doke?.serviceFavoritesController;\n    if (!controller?.toggleButton) {\n      button.dataset.favoriteState = 'unavailable';\n      button.title = 'Favoritos indisponíveis no momento.';\n      document.dispatchEvent(new CustomEvent('doke:service-favorite-error', { detail: { code: 'DOKE_FAVORITES_CONTROLLER_UNAVAILABLE', operation: 'card-toggle' } }));\n      return Promise.resolve(false);\n    }\n    return controller.toggleButton(button, { source: 'ad-card' });\n  };")
    patch('assets/js/components/ad-card-interactions.js',
      '      toggleFavorite(favorite);\n      return;',
      '      toggleFavorite(favorite).catch(() => {});\n      return;')
    patch('assets/js/components/ad-card-interactions.js',
      "      if (favorite) {\n        favorite.setAttribute('aria-pressed', favorite.classList.contains('is-active') ? 'true' : 'false');\n      }",
      "      if (favorite) {\n        favorite.dataset.serviceFavorite = '';\n        if (context.serviceId) favorite.dataset.favoriteServiceId = context.serviceId;\n        favorite.setAttribute('aria-pressed', favorite.classList.contains('is-active') ? 'true' : 'false');\n        window.Doke?.serviceFavoritesController?.hydrate?.(card);\n      }")

    patch('assets/js/pages/detalhe-anuncio-data-controller.js',
      "    {\n      key: 'detail-ad-experience',\n      src: 'assets/js/pages/detail-ad-experience.js?v=20260728-search-a02-v1',\n      ready: function () { return Boolean(Doke.detailAdExperience); }\n    }",
      "    {\n      key: 'service-favorites-controller',\n      src: 'assets/js/components/service-favorites-controller.js?v=20260728-search-a03-v1',\n      ready: function () { return Boolean(Doke.serviceFavoritesController); }\n    },\n    {\n      key: 'detail-ad-experience',\n      src: 'assets/js/pages/detail-ad-experience.js?v=20260728-search-a03-v1',\n      ready: function () { return Boolean(Doke.detailAdExperience); }\n    }")

    patch('assets/js/pages/detail-ad-experience.js',
      "    return favoritesService().isFavorite(normalizedServiceId).then(function (active) {\n      return updateFavoriteButtons(normalizedServiceId, active, { state: 'ready' });\n    }).catch(function (error) {",
      "    var controller = Doke.serviceFavoritesController;\n    var read = controller && typeof controller.ensureLoaded === 'function'\n      ? controller.ensureLoaded().then(function () { return controller.isFavorite(normalizedServiceId); })\n      : favoritesService().isFavorite(normalizedServiceId);\n    return read.then(function (active) {\n      return updateFavoriteButtons(normalizedServiceId, active, { state: 'ready' });\n    }).catch(function (error) {")
    patch('assets/js/pages/detail-ad-experience.js',
      "    var operation;\n    try {\n      operation = favoritesService().toggle(serviceId);\n    } catch (error) {\n      operation = Promise.reject(error);\n    }",
      "    var operation;\n    try {\n      var controller = Doke.serviceFavoritesController;\n      operation = controller && typeof controller.setFavorite === 'function'\n        ? controller.setFavorite(serviceId, !before, { source: 'detail-ad' })\n        : favoritesService().toggle(serviceId);\n    } catch (error) {\n      operation = Promise.reject(error);\n    }")
    patch('assets/js/pages/detail-ad-experience.js',
      "      button.dataset.favoriteExperienceBound = 'true';",
      "      button.dataset.favoriteExperienceBound = 'true';\n      button.dataset.serviceFavorite = '';\n      button.dataset.favoriteServiceId = resolveServiceId(getRoot());")

    favorite_scripts = "  <script src=\"assets/js/repositories/favorites-repository.js?v=20260728-search-a03-v1\"></script>\n  <script src=\"assets/js/services/favorites-service.js?v=20260728-search-a03-v1\"></script>\n  <script src=\"assets/js/components/service-favorites-controller.js?v=20260728-search-a03-v1\"></script>\n"
    patch('index.html',
      '  <script src="assets/js/services/services-service.js?v=20260720-moderation-flow-v1"></script>\n  <script src="assets/js/components/public-service-card.js?v=20260719-provider-handle-footer-v1"></script>',
      '  <script src="assets/js/services/services-service.js?v=20260720-moderation-flow-v1"></script>\n' + favorite_scripts + '  <script src="assets/js/components/public-service-card.js?v=20260728-search-a03-v1"></script>')
    patch('resultados.html',
      '    <script src="assets/js/services/services-service.js?v=20260720-moderation-flow-v1"></script>\n    <script src="assets/js/components/public-service-card.js?v=20260719-provider-handle-footer-v1"></script>',
      '    <script src="assets/js/services/services-service.js?v=20260720-moderation-flow-v1"></script>\n    <script src="assets/js/repositories/favorites-repository.js?v=20260728-search-a03-v1"></script>\n    <script src="assets/js/services/favorites-service.js?v=20260728-search-a03-v1"></script>\n    <script src="assets/js/components/service-favorites-controller.js?v=20260728-search-a03-v1"></script>\n    <script src="assets/js/components/public-service-card.js?v=20260728-search-a03-v1"></script>')

    patch('meu-perfil.html',
      '                <a class="profile-tabs__item doke-tab-pill" href="#profile-achievements" aria-controls="profile-achievements">Conquistas</a>\n                <a class="profile-tabs__item doke-tab-pill" href="#profile-about" aria-controls="profile-about">Sobre</a>',
      '                <a class="profile-tabs__item doke-tab-pill" href="#profile-favorites" aria-controls="profile-favorites">Favoritos</a>\n                <a class="profile-tabs__item doke-tab-pill" href="#profile-achievements" aria-controls="profile-achievements">Conquistas</a>\n                <a class="profile-tabs__item doke-tab-pill" href="#profile-about" aria-controls="profile-about">Sobre</a>')
    patch('meu-perfil.html',
      '            <section class="profile-feed client-profile-feed" data-profile-hydration-ready hidden aria-label="Áreas do meu perfil">\n              <section id="profile-achievements" class="profile-area profile-area--achievements doke-page-section" aria-label="Conquistas do cliente">',
      '''            <section class="profile-feed client-profile-feed" data-profile-hydration-ready hidden aria-label="Áreas do meu perfil">
              <section id="profile-favorites" class="profile-area profile-area--favorites doke-page-section" data-profile-favorites-surface data-favorites-state="loading" aria-label="Serviços favoritos">
                <div class="profile-owner-section-tools profile-owner-section-tools--island"><span>Favoritos <strong data-profile-favorites-count>0</strong></span><a class="profile-owner-mini-action doke-btn doke-btn--ghost doke-btn--sm" href="resultados.html">Buscar serviços</a></div>
                <p class="doke-loading-state" data-profile-favorites-loading>Carregando seus favoritos...</p>
                <div class="profile-favorites-grid" data-profile-favorites-grid hidden></div>
                <div class="profile-favorites-empty doke-empty-state" data-profile-favorites-empty hidden><strong>Nenhum serviço salvo</strong><p>Use o coração nos anúncios para reunir aqui os serviços que deseja acompanhar.</p><a class="doke-btn doke-btn--primary" href="resultados.html">Explorar serviços</a></div>
                <p class="doke-error-state" data-profile-favorites-error hidden>Não foi possível carregar seus favoritos agora.</p>
              </section>

              <section id="profile-achievements" class="profile-area profile-area--achievements doke-page-section" aria-label="Conquistas do cliente">''')
    patch('meu-perfil.html',
      '    <script src="assets/js/services/account-access-service.js?v=20260719-auth-fast-guard-v1" defer></script>',
      '''    <script src="assets/js/services/account-access-service.js?v=20260719-auth-fast-guard-v1" defer></script>
    <script src="assets/js/repositories/services-repository.js?v=20260720-moderation-flow-v1" defer></script>
    <script src="assets/js/services/services-service.js?v=20260720-moderation-flow-v1" defer></script>
    <script src="assets/js/repositories/favorites-repository.js?v=20260728-search-a03-v1" defer></script>
    <script src="assets/js/services/favorites-service.js?v=20260728-search-a03-v1" defer></script>
    <script src="assets/js/components/service-favorites-controller.js?v=20260728-search-a03-v1" defer></script>
    <script src="assets/js/components/public-service-card.js?v=20260728-search-a03-v1" defer></script>
    <script src="assets/js/components/ad-card-interactions.js?v=20260728-search-a03-v1" defer></script>
    <script src="assets/js/pages/profile/favorites-surface.js?v=20260728-search-a03-v1" defer></script>''')

    css = Path('assets/css/pages/client-profile.css')
    css_text = css.read_text(encoding='utf-8')
    old_css = css_text
    css_text = css_text.replace('body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-tabs__item[href="#profile-achievements"],', 'body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-tabs__item[href="#profile-favorites"],\nbody[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract]:has(#profile-favorites:target) .profile-tabs__item[href="#profile-favorites"],\nbody[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-tabs__item[href="#profile-achievements"],', 1)
    css_text = css_text.replace('body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-area--achievements {\n  display: grid;\n}', 'body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-area--favorites {\n  display: grid;\n}\n\nbody[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract] .profile-area--achievements {\n  display: none;\n}', 1)
    css_text = css_text.replace('body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract]:has(#profile-achievements:target) #profile-achievements,', 'body[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract]:has(#profile-favorites:target) #profile-favorites,\nbody[data-page="perfil"][data-profile-contract="clean-v1"][data-client-profile-contract]:has(#profile-achievements:target) #profile-achievements,', 1)
    if '.profile-favorites-grid' not in css_text:
        css_text += '''

body[data-profile-mode="client-edit"] .profile-favorites-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
}
body[data-profile-mode="client-edit"] .profile-favorites-grid[hidden] { display: none; }
body[data-profile-mode="client-edit"] .profile-favorites-empty { justify-items: center; gap: 10px; padding: clamp(24px, 5vw, 48px); text-align: center; }
body[data-profile-mode="client-edit"] .profile-favorites-empty[hidden] { display: none; }
@media (max-width: 1080px) { body[data-profile-mode="client-edit"] .profile-favorites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { body[data-profile-mode="client-edit"] .profile-favorites-grid { grid-template-columns: minmax(0, 1fr); } }
'''
    if css_text == old_css:
        raise RuntimeError('Expected client-profile CSS markers were not changed.')
    css.write_text(css_text, encoding='utf-8'); changed.append(str(css))

    quality = Path('.github/workflows/quality.yml')
    quality_text = quality.read_text(encoding='utf-8')
    old_quality = quality_text
    if "      - 'search/**'" not in quality_text:
        quality_text = quality_text.replace("      - 'cat/**'\n  push:", "      - 'cat/**'\n      - 'search/**'\n  push:", 1)
        quality_text = quality_text.replace("      - 'cat/**'\n  workflow_dispatch:", "      - 'cat/**'\n      - 'search/**'\n  workflow_dispatch:", 1)
    if 'Audit SEARCH-A03 favorites surfaces' not in quality_text:
        quality_text = quality_text.replace('      - name: Audit stacked CI trigger coverage\n        run: node scripts/audit-stacked-ci-trigger-coverage.js\n', '''      - name: Audit stacked CI trigger coverage
        run: node scripts/audit-stacked-ci-trigger-coverage.js

      - name: Audit SEARCH-A01 authority baseline
        run: node scripts/audit-search-authority-baseline.js

      - name: Audit SEARCH-A02 favorites authority retirement
        run: node scripts/audit-favorites-authority-retirement.js

      - name: Test SEARCH-A02 favorites authority runtime
        run: node scripts/test-favorites-authority-retirement-runtime.js

      - name: Audit SEARCH-A03 favorites surfaces
        run: node scripts/audit-service-favorites-surfaces.js

      - name: Test SEARCH-A03 batched favorites runtime
        run: node scripts/test-service-favorites-controller-runtime.js
''', 1)
    if quality_text == old_quality:
        raise RuntimeError('Expected quality workflow markers were not changed.')
    quality.write_text(quality_text, encoding='utf-8'); changed.append(str(quality))

    DIAGNOSTIC.write_text('SEARCH-A03 integration applied successfully.\nChanged:\n- ' + '\n- '.join(dict.fromkeys(changed)) + '\n', encoding='utf-8')


try:
    apply()
except Exception:
    DIAGNOSTIC.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTIC.write_text('SEARCH-A03 integration failed.\n\n' + traceback.format_exc(), encoding='utf-8')
    raise
