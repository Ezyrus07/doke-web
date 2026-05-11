# Doke — Plano de Organização Global

## Objetivo

Estabilizar a base global do frontend antes de continuar reformas por página. O foco é reduzir regressões, remover referências quebradas, consolidar contratos reutilizáveis e impedir que ajustes locais contaminem `core`, shell, sidebar, header ou wrappers globais.

## Regra de trabalho

Toda alteração deve respeitar a divisão:

- `assets/css/core`: tokens, reset, tipografia, layout base e utilitários globais.
- `assets/css/components`: elementos reutilizáveis como botões, cards, chips, avatars, ratings, inputs, modais e shell.
- `assets/css/patterns`: composições reutilizáveis formadas por componentes.
- `assets/css/pages`: layout específico da página.
- `assets/js/core`: infraestrutura compartilhada.
- `assets/js/components`: comportamento reutilizável.
- `assets/js/pages`: comportamento específico da página.

## Proibições

Não criar arquivos com nomes de correção temporária como `fix`, `hotfix`, `stage`, `final`, `novo`, `ajuste` ou `redesign`.

Não resolver problema local alterando `body`, shell, sidebar, header ou wrappers globais.

Não introduzir `!important` ou `style=""` como solução visual.

Não duplicar CSS/JS de botões, cards, chips, workers, publicações, avaliações, inputs, modais ou dropdowns.

## Ciclos de execução

### Ciclo Global 1 — Segurança objetiva

- Corrigir imports quebrados.
- Corrigir scripts de auditoria apontando para arquivos inexistentes.
- Validar que HTMLs não referenciam CSS/JS ausentes.

### Ciclo Global 2 — Contratos de base

- Mapear contratos oficiais de botões, cards, chips, avatars, ratings, section headers e shell.
- Definir fonte canônica para cada contrato.
- Proibir criação de variantes locais sem justificativa.

### Ciclo Global 3 — Shell e largura

- Validar `page-container-contract`, `responsive-page-contract`, `desktop-shell`, `desktop-topbar`, `desktop-sidebar` e limites mobile.
- Não redesenhar o shell; apenas corrigir incoerências de contrato.

### Ciclo Global 4 — Marketplace

- Consolidar index, resultados, detalhe-anuncio e perfil em cima dos mesmos contratos de cards, workers, publicações, avaliações, chips e botões.

### Ciclo Global 5 — Páginas operacionais

- Pedidos, carteira, notificações e configurações.

### Ciclo Global 6 — Comunicação

- Mensagens, comunidade e comunidade-interna, por serem páginas com maior risco estrutural.

## Critérios de aceite global

- Zero imports quebrados em HTMLs.
- Nenhum arquivo novo temporário de correção visual.
- Nenhum `!important` novo em alterações feitas.
- Nenhum `style=""` novo.
- CSS de página restrito ao layout específico.
- Componentes recorrentes centralizados em `components` ou `patterns`.
- Visual aprovado preservado por mudanças incrementais.
