# Domain Expansion E2E Runbook

## Escopo Sprint 61–75
Este runbook consolida os domínios novos:

- Anunciar / service listings
- Publicar / publications
- Comunidade / community

## Runtime local
O servidor local `backend/shared/testing/domain-expansion-e2e-local-server.js` valida HTTP real local sem rede externa.

```bash
npm run audit:domain-expansion-local-runtime
npm run validate:domain-expansion:local-runtime
```

## Status aprovado local
```txt
domain_expansion_local_runtime_validated
```

## Restrições
- Não altera HTML/CSS.
- Não ativa API no frontend.
- Não usa credencial real.
- Não roda produção.
- Staging real depende de relatórios e flags explícitas.
