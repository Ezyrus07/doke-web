# Ciclo Global 50 — Community legacy CSS removal

## Objetivo

Remover fisicamente, com segurança, os arquivos legacy de modal/layout da comunidade que já foram migrados no Ciclo Global 49 para `patterns` explícitos.

## Arquivos legacy alvos

```txt
assets/css/pages/comunidade/internal-modal-legacy.css
assets/css/pages/comunidade-interna/internal-modal-legacy.css
```

## Contratos substitutos

```txt
assets/css/patterns/community-request-modal.css
assets/css/patterns/community-room-layout.css
```

## O que este ciclo faz

- Adiciona um script de limpeza idempotente: `npm run cleanup:community-legacy-css`.
- Adiciona uma auditoria de segurança: `npm run audit:community-legacy-removal`.
- Garante que `comunidade.css` e `comunidade-interna.css` não voltem a importar `internal-modal-legacy.css`.
- Mantém a remoção física controlada por script, porque ZIP incremental não apaga arquivos existentes automaticamente.

## Como aplicar

Depois de descompactar este pacote sobre o projeto:

```bash
npm run cleanup:community-legacy-css
npm run audit:community-legacy-removal
```

## Critérios de aceite

```txt
0 import de internal-modal-legacy.css nos manifests principais
community-request-modal.css presente
community-room-layout.css presente
arquivos legacy removidos ou pelo menos desconectados
0 alteração visual intencional
0 !important novo
0 style="" novo
0 arquivo fix/hotfix/stage/final criado
```
