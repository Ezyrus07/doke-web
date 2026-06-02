# Candidatos a assets não usados

Este documento acompanha a auditoria de candidatos a CSS/JS não usados. Ele **não autoriza remoção automática**.

## Regra

Um arquivo só pode ser removido quando for comprovado que:

1. não é linkado diretamente por HTML;
2. não é importado por CSS ativo;
3. não é carregado dinamicamente por JS;
4. não é referenciado por documentação operacional ativa;
5. não pertence a uma tela ainda em evolução que dependa dele por carregamento condicional.

## Comando

```bash
npm run audit:unused-asset-candidates
```

Saída resumida:

```txt
docs/validation/unused-asset-candidates-summary.json
```

## Uso correto

Use esta auditoria para priorizar investigação. Não apague arquivos apenas porque aparecem como candidatos.
