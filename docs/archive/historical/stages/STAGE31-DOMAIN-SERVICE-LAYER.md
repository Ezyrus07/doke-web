# Stage 31 — Domain Service Layer

## Objetivo

Criar uma camada de serviços de domínio entre controllers e dados mockados, sem alterar layout, CSS ou marcação visual.

## O que mudou

Foram adicionados serviços para os principais domínios do produto:

- `profile-service.js`
- `search-service.js`
- `order-service.js`
- `message-service.js`
- `community-service.js`
- `notification-service.js`
- `wallet-service.js`
- `domain-data-service.js`

Os controllers continuam não invasivos, mas agora `controller-data.js` prefere `Doke.domainData.loadPageData(pageName)` antes de cair no carregamento bruto dos mocks.

## Por que isso importa

As páginas deixam de depender diretamente do formato exato dos arquivos JSON. Quando o Supabase entrar, a troca deve acontecer nos services, não nos HTMLs e não nos controllers.

## Regra de arquitetura

- Página não acessa Supabase diretamente.
- Controller não conhece caminho de JSON.
- Renderer não busca dados.
- Service decide a origem dos dados.
- `domain-data-service.js` compõe os dados necessários por página.

## Validação

Adicionado:

```bash
npm run audit:domain-services
```

Também incluído em:

```bash
npm run audit:all
```
