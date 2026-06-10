# CSS Cleanup Stage 38 — carteira.html

## Objetivo

Limpar a cascata ativa de `carteira.html`, removendo dependências antigas de shell/header/tablet/mobile e deixando o CSS da página responsável apenas pela composição específica da carteira.

## Alterações principais

- `carteira.html` deixou de carregar contratos antigos de shell, header, rail, tablet/mobile e cards que já não pertencem à estrutura-alvo.
- `assets/css/layout/header.css` passou a ser usado como contrato limpo de header.
- `assets/css/pages/carteira.css` foi reescrito como CSS de composição da página, sem `!important`.
- Responsabilidades globais de shell, rail, header, card, modal e componentes compartilhados não ficam mais dentro do CSS da carteira.

## Métricas

- `!important` ativo na cascata de `carteira.html`: `631 -> 0`.
- `assets/css/pages/carteira.css`: `7932 linhas -> 550 linhas`.
- `!important` total em `assets/css`: `12775 -> 12144`.
- CSS com chaves desbalanceadas: `0`.

## Riscos assumidos

Alto risco visual em `carteira.html`, especialmente em:

- cards de saldo/KPIs;
- painéis de estatísticas;
- extrato/movimentações;
- modais de saque/conta bancária;
- layout mobile/tablet.

Esta etapa prioriza previsibilidade da cascata e manutenção futura acima do acabamento visual atual.
