# Correção de integração — 10/07/2026

## Causa raiz

Os contratos canônicos de domínio, fluxo, layout e rotas eram carregados de forma inconsistente. Parte dos auditores também verificava somente referências diretas no HTML e ignorava imports transitivos dos manifestos CSS, gerando falsos negativos e incentivando fan-out de CSS.

## Correções aplicadas

- Classes canônicas de domínio adicionadas às superfícies antigas de publicações, pedidos, mensagens, perfil, carteira e configurações.
- Contratos de domínio e fluxo conectados às páginas principais sem quebrar o manifesto estrito de `index.html` e `resultados.html`.
- `resultados.html` passou a carregar layout, estabilidade desktop e limites responsivos pelo manifesto da página.
- Auditorias de domínio, fluxo, rotas e inventário passaram a resolver o grafo de imports CSS.
- Criado `docs/PAGE-ROUTE-MAP.md`.
- Cobertura visual passou a aceitar páginas adicionais e viewports equivalentes pelas dimensões.
- `perfil.html` passou a carregar `profile-service.js`.
- Auditor de serviços passou a validar presença e fronteiras reais de dependência, sem rejeitar carregamentos antecipados intencionais de serviços específicos de página.

## Testes aprovados

- `npm run audit:flows`
- `npm run audit:domain`
- `npm run audit:layout`
- `npm run audit:routes`
- `npm run audit:domain-services`
- `npm run audit:auth-session`
- `npm run test:main-marketplace-cycle-contract`

## Risco restante

O pipeline `audit:all` ainda para em `audit:responsive-inventory`, porque esse inventário exige arquivos nominais antigos (`desktop-shell.css`, `desktop-sidebar.css`, `desktop-topbar.css` e `desktop-search.css`) em páginas que usam contratos equivalentes consolidados. Esses arquivos não foram adicionados para evitar duplicação de autoridade e regressão visual.

Não foi executada validação visual completa em navegador nem comparação de screenshots.
