# SEC-001 — recuperação da linhagem de segurança

Data: 23 de julho de 2026.

## Resultado

A lacuna entre as migrations `109` e `135` foi corrigida no candidato de entrega. Foram recuperadas, byte a byte, as migrations `110–134`, três validações SQL, a Edge Function `service-moderation-operations`, sete testes contratuais e a autoridade de frontend da moderação.

A origem foi a última entrega cumulativa validada de autoridade de dados públicos. Cada arquivo recuperado foi comparado com o manifesto SHA-256 publicado naquela entrega. Os arquivos `135` e `136` já presentes na base atual são semanticamente iguais aos da entrega subsequente após normalização de CRLF/LF.

## Limite de autoridade

Esta entrega resolve a ausência física e fornece proveniência verificável, mas `SEC-B08` permanece aberto até que os arquivos sejam adicionados a um commit Git revisado e os gates sejam executados nesse mesmo SHA. Nenhuma migration foi promovida e nenhuma mutação foi realizada no staging.

## Arquivos funcionais recuperados

- `supabase/migrations/110–134`;
- `supabase/functions/service-moderation-operations/*`;
- `supabase/tests/010–012`;
- contratos locais de notification, public data, storage, moderação, quote template e search_path;
- `assets/js/repositories/service-moderation-repository.js`, migrado de RPC administrativa direta para a Edge Function;
- contrato de anexos atualizado para a autoridade privada das migrations `132–134`.

## Rollback

Remover apenas os arquivos enumerados em `reports/sec-001-lineage-recovery/recovery-manifest.json` e restaurar os dois arquivos marcados como `replace`. Não alterar as migrations `135–144`.

## Validações executadas

- manifesto SHA-256 histórico: todos os arquivos recuperados conferidos;
- continuidade numérica de migrations `93–144`: sem lacunas;
- continuidade semântica de `135–136`: igual à entrega subsequente após normalização CRLF/LF;
- `test:sec-001-lineage-recovery`: 10/10 grupos aprovados;
- `audit:all`: aprovado, com 0 críticos e 29 avisos preexistentes;
- `audit:agent-governance`: aprovado;
- `audit:e2e-lanes`: 14 specs ativos, 3 bloqueantes, 11 diagnósticos, 0 excluídos;
- `audit:quality-pipeline`: aprovado;
- `audit:domain-completion-matrix`: aprovado após regeneração do documento pela configuração autoritativa;
- `test:e2e:blocking`: 23/23 aprovados após reinício do helper HTTP local degradado;
- `test:visual:structural`: 105/105 aprovados em sete viewports;
- `node --check` nos arquivos JavaScript/MJS recuperados: aprovado;
- `git diff --check`: aprovado;
- varredura de segredos sobre os 52 arquivos candidatos ao commit: zero achados; evidência em `docs/validation/SEC-001-LINEAGE-RECOVERY-SECRET-SCAN.json`.

## Não executado nesta entrega

- GitHub Actions no SHA contendo a recuperação;
- aplicação ou reconciliação mutável de migrations no staging;
- canários autenticados remotos por persona;
- deploy da Edge Function ou qualquer alteração do projeto Supabase.
