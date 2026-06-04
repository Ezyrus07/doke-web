# Prompt 08 — Limpeza técnica de CSS

## Escopo executado

Esta etapa fez uma limpeza técnica controlada sobre a base acumulada do Prompt 07, sem redesenhar componentes.

## HTMLs reorganizados

Foram reorganizados os imports CSS dos HTMLs principais:

- `index.html`
- `pedidos.html`
- `resultados.html`
- `perfil.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `comunidade.html`
- `comunidade-interna.html`
- `configuracoes.html`
- `detalhe-anuncio.html`
- `finalizar-pedido.html`
- `pagamento.html`
- `avaliacao.html`
- `adicionar-cartao.html`
- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

## Ordem de importação normalizada

A ordem aplicada foi:

1. fontes externas;
2. core/base;
3. shell/layout;
4. componentes legados ainda necessários;
5. patterns;
6. CSS específico da página;
7. responsive foundation/runtime legado;
8. contratos compartilhados novos;
9. camada final de auditoria responsiva.

Os contratos novos continuam no final para preservar a hierarquia correta da cascata.

## Imports removidos dos HTMLs

Foram removidos imports redundantes que passaram a ser cobertos por contratos compartilhados:

- `assets/css/components/internal/topbar-standard.css`
- `assets/css/components/navigation/mobile-internal-header.css`
- `assets/css/components/navigation/mobile-bottom-nav.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`
- `assets/css/components/cards/mobile-list-card-system.css`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/overlays/mobile-overlay-system.css`

## Motivo da remoção

Esses arquivos estavam competindo com os contratos atuais:

- `assets/css/components/navigation/header-desktop.css`
- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/navigation/bottom-nav.css`
- `assets/css/components/cards/card-system.css`
- `assets/css/components/panels/mobile-panel.css`
- `assets/css/core/responsive-audit.css`

A remoção reduz duplicação, reduz vazamento mobile/desktop e diminui o volume de `!important` efetivamente carregado pelos HTMLs.

## Componentes preservados

Não foram removidos arquivos CSS físicos ainda. A limpeza física deve ocorrer apenas depois de validação visual local, porque alguns arquivos podem ser usados por páginas fora do escopo principal ou por imports indiretos.

## Encoding

Não foram encontrados sinais de mojibake em HTML/CSS revisados, como `Ã`, `Â`, `â€` ou caractere de substituição `�`. A documentação nova foi salva em UTF-8.

## Pendências conscientes

Ainda existem arquivos legados com muito `!important`, especialmente em CSS antigos da home e páginas específicas. Eles não foram reescritos nesta etapa porque remover `!important` internamente sem redesenhar a hierarquia completa desses arquivos pode causar regressão visual. A estratégia correta é continuar migrando regras válidas para componentes compartilhados e depois apagar os arquivos legados por etapa.

## Próximo passo recomendado

A próxima etapa ideal é atacar os overlays/modais antigos e consolidar de vez os arquivos de superfície visual, porque eles ainda são uma fonte provável de scroll duplicado, z-index concorrente e comportamento diferente entre mobile e desktop.
