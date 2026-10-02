# WAL-B03-A01 — Bank Data Protection Authority

## Escopo

Contrato **repository-only** para transformar o blocker `WAL-B03` em um plano de implementação verificável sem alterar banco, staging, deploy ou produção.

```text
sourceHead: 6eb8e55317a20f88f8ecb0f083c00c101b2afc59
matrix: v1.3.132
runtimeIntegrated: false
migrationPrepared: false
migrationApplied: false
stagingMutationPerformed: false
productionChanged: false
```

A autorização deste lote concede somente escrita no repositório. Não concede migration, staging, deploy, produção, merge ou Ready for Review.

**WAL-B03 permanece OPEN** até existir evidência runtime de que o staging deixou de armazenar e devolver dados bancários em texto claro.

## Predecessor preservado

Este lote não repete `WAL-A02 — bank-account sensitive-data boundary`.

WAL-A02 permanece autoridade para:

- classificar `account_holder`, `document`, `branch`, `account_number` e `pix_key` como sensíveis;
- definir `wallet-bank-account-masked-projection-v1`;
- proibir persistência bruta no browser;
- negar raw secret para support/admin;
- redigir logs;
- usar referência opaca para destino de saque.

WAL-B03-A01 fecha a distância entre esse contrato e o runtime observado.

## Evidência read-only reconciliada

A inspeção read-only de `doke-web-staging` (`zwkczgewzbsorbrjuzpb`) confirmou, sem ler valores bancários:

- `public.wallet_bank_accounts` possui 1 linha;
- RLS está habilitado;
- `authenticated` possui `SELECT`;
- a policy de leitura permite proprietário ou support/admin;
- `account_holder`, `document`, `branch`, `account_number` e `pix_key` continuam como `text`;
- não há colunas de ciphertext/token/hash/key-version observadas;
- não há trigger de proteção bancária;
- `public.save_wallet_bank_account` continua `SECURITY DEFINER`, executável por `service_role`, e retorna `public.wallet_bank_accounts`;
- o dispatcher converte esse retorno com `to_jsonb(...)`;
- a Edge Function `self-service-operations` devolve o resultado do dispatcher;
- `pgcrypto 1.3` e `supabase_vault 0.3.1` estão instalados.

Logo, o blocker é simultaneamente de **at-rest storage**, **read authority** e **response contract**. RLS sozinho não fecha WAL-B03.

## Arquitetura alvo

### Intake transitório

Dados brutos só podem existir durante uma operação server-side de gravação. Não podem ser persistidos em browser, gravados em logs/audit payloads, devolvidos após save ou incluídos em fixtures/artefatos.

### Autoridade de chave

Autoridade proposta:

```text
provider: Supabase Vault
alias: wal-bank-data-key-v1
domain: WAL-001
```

É proibido reutilizar automaticamente `private.kyc_crypto_secrets`. KYC possui finalidade, rotação e autoridade distintas.

Nenhum material secreto entra no repositório. Browser, support e admin não recebem acesso à chave.

### Secret store privado

Candidato futuro, ainda **não criado**:

```text
private.wallet_bank_account_secrets_v1
```

Requisitos:

- fora do Data API;
- zero acesso direto de `anon` e `authenticated`;
- zero acesso direto de tabela por `service_role`;
- acesso somente por funções purpose-bound;
- nenhum plaintext como coluna;
- ciphertext + `key_version` + referência opaca;
- lifecycle com `created_at`, `rotated_at`, `retired_at`, `purge_after`, `destroyed_at`.

### Criptografia candidata

A futura migration poderá usar `pgcrypto` com AES-256/PGP e chave WAL no Vault, desde que prove:

- ciphertext não determinístico para entradas iguais;
- payload vinculado a `user_id`, `secret_reference_id` e `key_version`;
- decryption verifica esse vínculo;
- nenhum RPC genérico de decrypt;
- key rotation versionada;
- nenhum secret em migration source.

Isso é arquitetura candidata, não migration aplicada.

### Projeção de browser e operador

Owner, support e admin recebem somente `wallet-bank-account-masked-projection-v1`.

Save e GET da conta bancária deverão retornar exclusivamente essa projeção.

Após o cutover, são incompatíveis com o contrato de resposta:

```text
RETURNS public.wallet_bank_accounts
returning *
to_jsonb(raw_row)
```

### Support/admin

```text
support raw access: DENY
admin raw access: DENY
break-glass: NOT DEFINED / NOT AUTHORIZED
```

Qualquer necessidade futura de raw access exige contrato separado com finalidade, role, expiração, justificativa e audit trail.

### Decryption

Não existe consumidor autorizado de plaintext neste lote.

Owner não precisa decrypt para leitura. Support/admin também não.

Um futuro payout provider adapter só poderá decriptar quando houver PAY-B01 fechado, provider autorizado, função purpose-bound, autorização runtime separada e auditoria sem plaintext.

### Retenção

Nenhum prazo numérico foi inventado.

```text
durationApproved: false
durationDays: null
```

A infraestrutura futura precisa suportar `retired_at`, `purge_after`, `destroyed_at` e crypto-erasure. O valor de `purge_after` depende de política jurídica/financeira aprovada.

## Sequência futura obrigatória

1. `WAL-B03-A02` — migration candidate **repository-only**.
2. `WAL-B03-A03` — staging migration + protected backfill + rollback canary.
3. `WAL-B03-A04` — masked runtime cutover.
4. `WAL-B03-A05` — retirement do plaintext legado após equivalência.

Cada gate exige autorização própria. `Next Safe Action != Authorized Action`.

## Critérios para fechar WAL-B03

- nenhum plaintext bancário persiste fora do secret store protegido;
- Data API/browser não obtêm raw bank data;
- owner, support e admin recebem somente projeção mascarada;
- save/get não devolvem row bruto;
- key authority é WAL-specific e rotacionável;
- logs/auditoria não carregam plaintext;
- retention lifecycle está governado;
- backfill e rollback são provados;
- plaintext legado só é retirado após cutover certificado.

## Efeitos deste lote

```text
migration file created: false
migration applied: false
staging mutation: false
deploy: false
provider contact: false
credential configured: false
real bank-data read: false
real bank-data write: false
production change: false
merge: false
ready for review: false
```
