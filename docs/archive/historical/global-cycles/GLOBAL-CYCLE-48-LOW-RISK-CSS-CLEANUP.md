# Ciclo Global 48 — limpeza de CSS legado de baixo risco

## Objetivo

Remover apenas arquivos CSS legados que não são carregados por HTML/manifests ativos e que já tinham histórico de depreciação.

## Arquivos removidos pelo script

```txt
assets/css/components/ui/doke-legacy-bridge.css
assets/css/components/surface-contract-final.css
```

## Por que esses arquivos foram escolhidos

- Não são carregados diretamente por HTMLs principais.
- Não devem governar contratos visuais atuais.
- `doke-legacy-bridge.css` já era bloqueado pela auditoria de bridge quando existia com conteúdo.
- `surface-contract-final.css` era um shim inerte e depreciado.

## Arquivos que NÃO foram removidos neste ciclo

```txt
assets/css/pages/notificacoes/pedidos-parity.css
assets/css/pages/comunidade/internal-modal-legacy.css
```

Esses ainda são importados por manifests de página e podem afetar visual. Devem ser migrados/validados em ciclo próprio.

## Comandos

```bash
npm run cleanup:low-risk-css
npm run audit:low-risk-css-cleanup
```

## Critérios de aceite

- Os dois shims removidos não existem mais no tree ativo.
- Nenhum HTML/CSS/JS ativo referencia esses arquivos.
- Nenhum `!important` novo.
- Nenhuma alteração visual intencional.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final` visual novo.
