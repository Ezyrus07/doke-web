# Stage 30 — Mock Controller Wiring

## Objetivo

Conectar os controllers de página aos mocks oficiais sem alterar layout, CSS ou renderização visual existente.

Esta etapa prepara a lógica real do Doke para consumir dados por camadas (`services -> controllers -> renderers`) sem acoplar HTML de página diretamente ao Supabase/Firebase.

## O que foi adicionado

- `assets/js/controllers/controller-data.js`
- `scripts/audit-controller-mock-wiring.js`
- script `npm run audit:controller-mocks`

## O que foi alterado

- `assets/js/services/mock-data-service.js` deixou de ser ES module e passou a expor `window.Doke.mockData`, compatível com o padrão atual de scripts do projeto.
- Os 10 controllers principais agora chamam `Doke.controllerData.loadForPage(pageName)`.
- As 10 páginas principais carregam `mock-data-service.js` e `controller-data.js` antes do controller específico da página.

## Regra de segurança visual

Esta stage é intencionalmente não invasiva:

- não cria cards novos na tela;
- não remove HTML existente;
- não muda CSS;
- não troca layout;
- não renderiza listas automaticamente.

Os dados são carregados e registrados em `Doke.state` para a próxima etapa migrar renderização de forma controlada.

## Recursos por página

| Página | Recursos mock carregados |
|---|---|
| index | services, communities, notifications |
| resultados | services, users |
| pedidos | orders |
| mensagens | messages, users |
| comunidade | communities |
| comunidade-interna | communities, messages, users |
| perfil | users, services, orders |
| carteira | wallet |
| notificacoes | notifications |
| configuracoes | users |

## Próximo passo recomendado

Criar renderização progressiva e protegida por containers explícitos (`data-doke-render-target`) para evitar tocar no HTML visual aprovado até termos baseline visual.
