# Sistema de perfis

## Diretriz atual

Todos os perfis públicos e internos passam a nascer da mesma base estrutural:

- `perfil.html`
- `perfil-profissional.html`
- `perfil-cliente.html`

Essas páginas compartilham:

- `assets/css/pages/perfil.css`
- `assets/js/pages/perfil.js`
- `assets/js/features/profile/profile-renderer.js`
- `assets/js/features/profile/profile-variants.js`
- `assets/data/mocks/profile-data.js`

## Variantes ativas

### `professionalPublic`
- página pública do profissional
- foco em conversão, prova social e vitrine

### `professionalOwner`
- página interna do profissional dono da conta
- foco em gestão, reputação, conteúdo e ajustes

### `clientPublic`
- página pública do cliente
- foco em leitura rápida do perfil, sem excesso de módulos

## Regra de evolução

Antes de criar uma nova página de perfil, verificar se o caso cabe em uma variante do sistema atual.

Só criar outra página se houver ruptura real de arquitetura. Diferença puramente visual ou de conteúdo deve ser resolvida por:

- `data-profile-key`
- dados em `profile-data.js`
- classes de variante adicionadas pelo renderer

## Objetivo

Evitar:

- bifurcação de CSS
- JS duplicado por página
- perfis com estrutura incompatível
- manutenção visual inconsistente
