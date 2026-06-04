# Ciclo Global 56 — higiene de referências a assets removidos

## Objetivo

Evitar que arquivos gerados antigos ou referências soltas a CSS removidos confundam os próximos ciclos de limpeza.

Este ciclo não altera visual, HTML de página, CSS de tela, shell, sidebar ou header.

## Assets removidos tratados como legado

- `assets/css/components/ui/doke-legacy-bridge.css`
- `assets/css/components/surface-contract-final.css`
- `assets/css/pages/comunidade/internal-modal-legacy.css`
- `assets/css/pages/comunidade-interna/internal-modal-legacy.css`

## O que foi criado

- `scripts/cleanup-stale-audit-artifacts.js`
- `scripts/audit-removed-asset-reference-hygiene.js`

## Comandos

```bash
npm run cleanup:stale-audit-artifacts
npm run audit:removed-asset-reference-hygiene
```

## Decisão técnica

O arquivo `component_audit_data.json` é um artefato gerado antigo na raiz do projeto. Ele guarda referências a CSS removidos e não deve ser tratado como fonte de verdade ativa.

Como ZIP incremental pode não apagar arquivo já existente no projeto local, a remoção é feita via script seguro.

## Critérios de aceite

- Nenhuma referência ativa a CSS removido em HTML/CSS/JS de runtime.
- Nenhum `component_audit_data.json` stale na raiz.
- Documentação e scripts de cleanup podem citar os arquivos removidos por motivos históricos/operacionais.
- Nenhuma alteração visual.
