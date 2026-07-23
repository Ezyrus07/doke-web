# Doke — entrega de recuperação de linhagem SEC-001

## Estado

**RECOVERED / PENDING REVIEWED GIT COMMIT**

A base recebida apresentava a sequência `109 → 135`, sem as migrations `110–134`. Esta entrega recupera a linhagem intermediária, os testes SQL e contratuais, e a Edge Function `service-moderation-operations` a partir de uma entrega histórica validada por SHA-256.

## Causa raiz

Os arquivos haviam sido produzidos e validados em uma entrega cumulativa anterior, mas não foram incorporados ao histórico Git usado pelo candidato do PR #6. Por isso, o staging possuía efeitos que não eram reproduzíveis pela árvore versionada.

## Alterações funcionais

- restauração exata das migrations `110–134`;
- restauração de `supabase/tests/010–012`;
- restauração de `supabase/functions/service-moderation-operations/*`;
- restauração dos contratos de segurança associados;
- atualização do repositório administrativo de moderação para chamar a Edge Function, sem RPC privilegiada direta no navegador;
- atualização do contrato de anexos para a autoridade privada das migrations `132–134`;
- atualização da matriz de domínio mantendo `SEC-B08` aberto até o commit e a repetição dos gates.

## Validação

- 10/10 grupos do lote de linhagem: PASS;
- `audit:all`: PASS, zero críticos e 29 avisos preexistentes;
- governança, partição E2E e pipeline de qualidade: PASS;
- sequência de migrations `93–144`: sem lacunas;
- sintaxe JS/MJS: PASS;
- secret scan no escopo recuperado: zero achados;
- nenhum comando de mutação executado no Supabase.

## Pendência obrigatória

A recuperação ainda deve ser commitada sobre o head revisado do PR #6 e validada pelo GitHub Actions nesse mesmo SHA. Somente depois devem ser repetidos os canários read-only/rollback de staging. O SEC-001 não está concluído.

## Rollback

Use `SEC-001-LINEAGE-RECOVERY-PATCH-MANIFEST.json` para remover os arquivos adicionados e restaurar os arquivos modificados a partir da base anterior. Não remova nem reaplique `135–144`.
