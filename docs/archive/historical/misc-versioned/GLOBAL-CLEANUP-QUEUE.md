# Global Cycle 4 — Fila de Limpeza por Página

Este documento transforma o inventário de CSS/JS em uma fila de execução. Ele não autoriza remoção cega: cada item precisa de baseline visual antes/depois quando a página for crítica.

## Regra de execução

- Não remover imports em massa.
- Não mexer em páginas em evolução para fechar visual definitivo.
- Priorizar contratos globais e redução de dependências duplicadas.
- Nenhum `!important` novo.
- Nenhum CSS `fix`, `hotfix`, `stage`, `final`, `novo`, `ajuste` ou `redesign`.

## Ordem recomendada

### 1. Base global e scripts

- Manter `audit:page-assets` como auditoria fixa no projeto.
- Usar `docs/GLOBAL-PAGE-ASSET-INVENTORY.md` antes de remover qualquer import.

### 2. Páginas de referência do marketplace

| Página | Motivo | Ação principal |
|---|---|---|
| `index.html` | 134 CSS, 14528 !important carregados | consolidar cards, workers, publicações, avaliações e largura sem congelar visual provisório |
| `resultados.html` | 116 CSS, 7295 !important carregados, em evolução | consolidar cards, workers, publicações, avaliações e largura sem congelar visual provisório |
| `perfil.html` | 105 CSS, 11692 !important carregados | consolidar cards, workers, publicações, avaliações e largura sem congelar visual provisório |
| `detalhe-anuncio.html` | 27 CSS, 948 !important carregados, em evolução | consolidar cards, workers, publicações, avaliações e largura sem congelar visual provisório |

### 3. Páginas operacionais em evolução

| Página | Motivo | Ação principal |
|---|---|---|
| `carteira.html` | 70 CSS, 3690 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |
| `finalizar-pedido.html` | 59 CSS, 2894 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |
| `pagamento.html` | 59 CSS, 2894 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |
| `configuracoes.html` | 78 CSS, 3654 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |
| `avaliacao.html` | 59 CSS, 2894 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |
| `adicionar-cartao.html` | 51 CSS, 1770 !important | limpar estrutura/imports, mas não transformar visual atual em contrato definitivo |

### 4. Comunicação e comunidade

| Página | Motivo | Ação principal |
|---|---|---|
| `mensagens.html` | 77 CSS, 33 JS, 7244 !important | ciclo próprio; preservar layout aprovado e reduzir contratos/parity/final antigos por blocos |
| `comunidade.html` | 87 CSS, 32 JS, 3684 !important | ciclo próprio; preservar layout aprovado e reduzir contratos/parity/final antigos por blocos |
| `comunidade-interna.html` | 100 CSS, 31 JS, 8177 !important | ciclo próprio; preservar layout aprovado e reduzir contratos/parity/final antigos por blocos |
| `notificacoes.html` | 85 CSS, 32 JS, 4027 !important | ciclo próprio; preservar layout aprovado e reduzir contratos/parity/final antigos por blocos |

### 5. Auth e arquivos auxiliares

| Página | Motivo | Ação principal |
|---|---|---|
| `auth/login.html` | severidade Média | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |
| `auth/cadastro.html` | severidade Média | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |
| `auth/esqueci-senha.html` | severidade Média | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |
| `docs/ui-kit.html` | severidade Alta | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |
| `teste.html` | severidade Baixa | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |
| `tools/responsive-stage13-dashboard.html` | severidade Baixa | revisar se é ativo, documentação ou legado; não misturar com fluxo principal |

## Primeira ação de limpeza recomendada

Começar por `index.html` porque ele é a referência visual do Doke e carrega muitos contratos que depois impactam `resultados.html`, `perfil.html` e `detalhe-anuncio.html`.

Checklist antes do primeiro corte:

- [ ] screenshot desktop do `index.html`;
- [ ] screenshot mobile do `index.html`;
- [ ] lista de blocos visuais: anúncios, workers, publicações, comunidades, filtros, topbar;
- [ ] mapa de imports suspeitos;
- [ ] remover no máximo um grupo de imports por vez;
- [ ] validar sem regressão visual.