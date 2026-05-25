# Doke — correção responsiva por prioridade

Escopo executado com validação objetiva. Não houve mudança subjetiva de cor, imagem, copy ou hierarquia visual sem métrica.

## Prioridade 1 — headers, rails/containers e overflow horizontal

| Métrica | Antes | Depois | Resultado |
|---|---:|---:|---|
| Falhas totais no teste responsivo após início do ciclo P1 | 185 | 99 | P1 removida do conjunto de falhas; restaram somente cards |
| `app-header` | 23 | 0 | PASS |
| `app-header__inner` | 27 | 0 | PASS |
| botão busca/voltar equivalente | 11 | 0 | PASS |
| location pill | 7 | 0 | PASS |
| profile pill | 11 | 0 | PASS |
| avatar | 7 | 0 | PASS |
| overflow horizontal no teste de contrato | 0 | 0 | PASS |

Arquivos principais envolvidos: `assets/css/components/layout/responsive-priority-contract.css`, `assets/css/components/shell/app-header-canonical-contract.css`, `assets/css/components/shell/shared-page-width-contract.css`.

## Prioridade 2 — cards compartilhados contra baseline do index

| Métrica | Antes da P2 | Intermediário | Depois | Resultado |
|---|---:|---:|---:|---|
| Falhas totais no teste responsivo | 99 | 48 | 0 | PASS |
| `.doke-ad-card` | 36 | 0 | 0 | PASS |
| `.publication-card` | 22 | 7 → 2 | 0 | PASS |
| `video-card / worker-card` | 36 | 36 | 0 | PASS |
| `review-card` | 5 | 0 | 0 | PASS, seletor corrigido para não capturar elementos internos |

Correção objetiva aplicada em `assets/css/components/layout/responsive-priority-cards.css` usando medidas reais do `index.html` nos breakpoints validados.

Ajuste de teste aplicado em `scripts/test-responsive-contract.js`: o seletor de review deixou de usar `[class*="review-card"]`, porque capturava elementos internos como `__top` e `__avatar` como se fossem cards raiz. A validação continua cobrindo somente cards de review compartilhados reais: `.doke-review-card` e `article.review-card` equivalentes.

## Prioridade 3 — section headers, badges, filtros, botões e texto cortado

| Auditoria | Antes | Depois atual | Status |
|---|---:|---:|---|
| Section header contract | 134 divergências | 29 divergências | Parcial / pendências estruturais |
| Overflow/text clipping | 316 ocorrências no primeiro baseline conhecido | 260 ocorrências atuais | Parcial / não bloqueia o teste de contrato |
| Responsive contract test final | 99 após P1 | 0 após P2 | PASS |

As 29 divergências restantes de section header envolvem principalmente headers com conteúdo não equivalente ao padrão simples `título + Ver todos/Ver mais`, como `Mais anúncios` com filtros embutidos, `Configurações` com estrutura própria e headers com texto/subconteúdo empilhado. Corrigir isso exigiria decisão estrutural/visual de separar filtros do header ou alterar hierarquia de conteúdo. Portanto, foi registrado como pendência em vez de forçar redesign.

## Breakpoints validados

- 390x844
- 608x926
- 810x1080
- 1024x768
- 1280x800

## Resultado final do gate principal

```txt
npm run test:responsive-contract
Status: PASS
Checks: 667
Failures: 0
Skips: 291
```

## Pendências objetivas para aprovação posterior

1. Decidir se `Mais anúncios` deve deixar de embutir filtros dentro do section header para zerar altura divergente sem esconder conteúdo.
2. Definir se `comunidade.html` e `configuracoes.html` devem migrar para o mesmo section-header simples do marketplace ou manter cabeçalhos compostos próprios.
3. Revisar o audit de overflow/text clipping: parte das ocorrências atuais vem de elementos dentro de rails horizontais e cards parcialmente fora da viewport por design de carrossel, então a ferramenta precisa de refinamento para diferenciar overflow real de overflow esperado de rail.
