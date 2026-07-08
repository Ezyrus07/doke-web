# CSS import resolution

Gerado em: 2026-07-08T15:17:20.204Z

## Resumo

- HTMLs raiz avaliados: 22
- CSS ativo/importado visitado: 291
- Referências CSS verificadas: 496
- Referências ausentes: 0

## Política

- Todo `<link rel="stylesheet">` local em HTML raiz deve resolver para arquivo existente.
- Todo `@import url(...)` local alcançável a partir dos HTMLs raiz deve resolver para arquivo existente.
- Querystrings de cache busting são ignoradas durante a resolução.
- Arquivos em `reports/generated/` não são tratados como fonte ativa de runtime.

## Violações

Nenhuma violação encontrada.
