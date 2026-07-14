# Auditoria de navegação e lifecycle — Etapa 1

Base analisada: `dokee-web-site(17).zip`  
Data: 13/07/2026  
Escopo runtime excluído de alterações: `comunidade-interna.html` e CSS da Comunidade.

## Veredito

O problema principal não é ausência de loading. O projeto possui autoridades parciais que tomam decisões independentes sobre boot, shell, skeleton, guard e troca de rota. Isso permite estados impossíveis e transições em cascata.

## Causa raiz confirmada do fluxo recente

Em `anunciar-servico.html`:

- o CSS oculta `.post-service-screen` enquanto `data-professional-access-state` não é `allowed`;
- o guard profissional depende de leituras assíncronas de perfil e verificação;
- o `document-preloader` encerra após estilos/fontes e uma duração mínima, sem aguardar o guard;
- quando o usuário será negado, o guard faz hard `location.replace` somente após resolver.

Portanto existe uma janela possível com **preloader encerrado + conteúdo protegido invisível + nenhum skeleton/erro**. Essa é a causa direta da tela vazia antes do redirecionamento.

No destino `verificacao-profissional.html`:

- o preloader está configurado como `reload`;
- a hidratação começa no `DOMContentLoaded`;
- o skeleton usa `skeletonMode: "always"` e `minDuration: 320`;
- o conteúdo real só é liberado após `service.getContext()`.

A combinação evita o conteúdo proibido, mas ainda pode produzir passagem visual fragmentada e duração artificial em dados rápidos.

## Inventário quantitativo

Varredura em HTMLs raiz/auth e `assets/js`, excluindo a implementação de `comunidade-interna`:

- 91 chamadas/mutações de navegação em 29 arquivos;
- 35 atribuições a `location.href`;
- 10 chamadas `location.replace`;
- 7 chamadas `location.assign`;
- 17 chamadas `DokeNavigate`;
- 4 `history.pushState`;
- 10 `history.replaceState`;
- 2 `history.back`;
- 6 chamadas locais com nome `navigate` que exigem classificação por autoridade.

Isso demonstra que a navegação ainda não possui uma única fronteira pública.

## Sistemas concorrentes encontrados

| Sistema | Responsabilidade declarada | Sobreposição/risco |
|---|---|---|
| `document-preloader.js` | boot de documento | duração mínima de 520 ms, timeout e detecção própria de navegação interna; pode liberar antes do guard/lifecycle. |
| `page-hydration.js` | loading/ready/empty/error | também detecta hard/internal, controla splash opcional, min/max duration e prepara documentos de rota. |
| `stable-shell-router.js` | troca interna preservando shell | também decide skeleton de rota, histórico, recursos, scroll e fallback para documento. |
| `app.js` | shell e navegação global | contém outra quantidade relevante de decisões de navegação e fallbacks. |
| `social-page-router.js` | navegação especializada | adiciona mais uma política de push/replace/fallback. |
| `route-guard.js` | auth | modo padrão `observe` permite páginas incompletas não protegidas de forma uniforme. |
| `professional-access-service.js` | permissão profissional | decide política e também método de navegação; hard redirect é padrão no guard. |

## Cobertura das páginas prioritárias

Todas as 13 páginas prioritárias carregam o document preloader e o stable-shell router, mas somente 7 possuem `page-hydration.js` com skeleton estrutural no HTML.

| Página | Preloader | Hydration + skeleton | Estado inicial | Risco principal |
|---|---:|---:|---|---|
| `index.html` | sim | sim | loading | boot + hydration independentes. |
| `anunciar-servico.html` | sim | não | loading/invisível por guard | zero-surface durante guard negado. |
| `verificacao-profissional.html` | reload | sim | loading | gap entre boot e hydration; mínimo artificial. |
| `tornar-profissional.html` | sim | sim | loading | política local ainda controla duração. |
| `admin.html` | sim | não | loading | conteúdo sem skeleton estrutural canônico. |
| `admin-verificacao.html` | sim | não | não declarado | lifecycle implícito. |
| `meu-perfil.html` | sim | sim | loading | múltiplos inicializadores/rehydration. |
| `perfil-profissional.html` | sim | não | loading | boundary sem skeleton canônico. |
| `pedidos.html` | sim | sim | loading | CSS e preloader específicos ainda coexistem com o global. |
| `mensagens.html` | sim | sim | ready | HTML declara ready enquanto conteúdo de hydration começa hidden. |
| `pagamento-profissional.html` | sim | não | ready | dados/estado operacional podem aparecer antes de validação. |
| `carteira.html` | sim | não | ready | conteúdo financeiro sem lifecycle estrutural uniforme. |
| `configuracoes.html` | sim | sim | loading | boot + hydration independentes. |

## Problemas de contrato

### P0

1. Possibilidade de nenhuma superfície visível em `anunciar-servico` enquanto o guard resolve.
2. Autoridades duplicadas detectam modo de navegação e controlam transição sem estado compartilhado.
3. Guards e controllers usam métodos de navegação diferentes.

### P1

1. Cobertura de skeleton inconsistente nas páginas prioritárias.
2. Estados iniciais `ready` e `loading` não seguem uma regra única.
3. Durações mínimas locais e globais podem se somar.
4. Router, lifecycle e boot usam marcadores próprios em `sessionStorage`/dataset.

### P2

1. Políticas de scroll e foco não estão documentadas em uma autoridade única.
2. Retry de hydration pode recarregar via router ou documento dependendo da disponibilidade global.
3. Queries de versão dos mesmos cores variam entre páginas, dificultando rastrear baseline efetiva.

## Sequência de correção recomendada

A próxima etapa deve criar uma fachada core pequena, sem migrar páginas ainda, que exponha modo de entrada e estado compartilhado. Depois, migrar somente o fluxo `anunciar-servico → verificacao-profissional` e validar hard load, internal, guard, back/forward e erro de repository.

Não é seguro começar refinando animação ou reduzindo durations isoladamente; isso esconderia a corrida sem corrigir a coordenação.
## Arquivos da Etapa 1

Criados:

- `config/navigation-lifecycle-contract.json`;
- `docs/NAVIGATION-LIFECYCLE-CONTRACT.md`;
- `docs/NAVIGATION-LIFECYCLE-AUDIT-STAGE-01.md`;
- `docs/NAVIGATION-LIFECYCLE-TEST-MATRIX.md`;
- `scripts/audit-navigation-lifecycle-contract.js`;
- relatórios `reports/generated/navigation-lifecycle-*`.

Alterados:

- `package.json`, com comandos de auditoria normal e strict;
- `docs/ACTIVE-CONTRACTS-INDEX.md`, registrando o contrato vivo.

Nenhum HTML, CSS ou JavaScript runtime foi alterado nesta etapa.

## Testes executados

Passaram:

- `node --check scripts/audit-navigation-lifecycle-contract.js`;
- `npm run audit:navigation-lifecycle-contract` (com findings esperados);
- `npm run test:admin-professional-verification-contract`;
- `npm run test:professional-identity-verification-contract`;
- `npm run audit:product-script-budget`;
- `npm run audit:shared-app-header-contract`;
- `npm run audit:form-button-contract`;
- `npm run audit:overlay-modal-contract`;
- `npm run audit:modal-visual-contract`;
- `npm run audit:security-permission-contract`.

`npm run audit:agent-governance` falhou em `audit:content-action-contract` por 15 violações preexistentes em `novidades.html`, `assets/css/pages/ajuda.css` e `assets/css/pages/novidades.css`. Esses arquivos não foram alterados nesta etapa.

Não executados: Playwright, validação visual, matriz responsiva, throttling, CPU slowdown e back/forward manual.

## Rollback

Remover os arquivos criados nesta etapa e reverter apenas `package.json` e `docs/ACTIVE-CONTRACTS-INDEX.md`. Como não houve mudança runtime, o rollback não altera comportamento do produto.

