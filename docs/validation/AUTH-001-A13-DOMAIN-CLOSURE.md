# AUTH-001 / AUTH-A13 — Reconciliação de encerramento do domínio

## Status

`DONE`

**Disposição canônica:** `core_done_external_blocked`.

O núcleo técnico de autenticação, sessão e identidade está concluído. O domínio não é declarado `production_ready` porque permanecem dependências externas explícitas de e-mail, SMS e plano pago.

## Causa-raiz

A implementação ativa já havia retirado provider mock, fallbacks locais, tokens no snapshot público e mutações locais de identidade. Entretanto, `config/domain-completion-matrix.json` ainda registrava:

- `runtimeBaseline.authProvider: mock`;
- AUTH-001 com UI `hybrid`;
- autoridade server-side `partial`;
- blocker `AUTH-B02`, apesar da retirada completa do provider selecionável;
- blocker agregado `AUTH-B04`, misturando capacidades concluídas com mudanças de contato ainda bloqueadas.

A matriz gerada estava deterministicamente sincronizada com uma fonte machine-readable obsoleta. Portanto, ausência de drift não representava verdade arquitetural.

## Classificação final

### Núcleo técnico — DONE

- Supabase é o único provider ativo do navegador.
- Login, cadastro, recuperação, reset, reautenticação, refresh e logout usam a autoridade Supabase.
- Rotas privadas e administrativas falham fechado.
- O snapshot `doke.auth.session.v1` não contém access token ou refresh token.
- Perfil, configurações e onboarding usam operações server-side reconciliadas.
- Role profissional e revisão KYC são server-only.
- Não existe fallback local/mock de autenticação ou mutação de identidade.

### Produção — BLOCKED EXTERNAL

#### AUTH-EXT-MAIL-001

Origem: `AUTH-A07 / MAIL-001`.

Mudança verificada de e-mail depende de entrega transacional real, redirect controlado, expiração, rejeição de replay e limpeza de identidade sintética. O SMTP de desenvolvimento já retornou limite `429`; mocks não fecham esse gate.

#### AUTH-EXT-SMS-001

Origem: `AUTH-A07`.

Mudança de telefone permanece indisponível até existir provider SMS, política de custo e canário real. Nenhum fluxo local ou simulado será habilitado.

#### AUTH-EXT-PAID-001

Origem: `PAID-001 / SEC-B05`.

A proteção de senhas vazadas do Supabase exige plano pago. O código não pode substituir essa proteção do provider.

## Implementação AUTH-A13

- `assets/js/config/runtime-flags.js` reconciliado para `authProvider: 'supabase'`;
- `runtimeBaseline.authProvider` da matriz alterado para `supabase`;
- AUTH-001 promovido para maturidade 4, autoridade remota/canônica e staging operacional;
- blockers históricos resolvidos retirados;
- blockers externos separados por dependência;
- critical flows deixam de referenciar `AUTH-B02` e `AUTH-B04`;
- testes e evidências atuais adicionados à matriz;
- criado `scripts/audit-auth-domain-closure.js`;
- criados scripts npm permanentes para os runtimes de onboarding, autoridade profissional e fechamento do domínio;
- criado o gate permanente `Audit AUTH-001 domain closure` no Quality;
- matriz Markdown regenerada deterministicamente;
- contrato e diário técnico reconciliados;
- workflow e codemod temporários removidos.

## Gate permanente

O audit AUTH-A13 falha se:

1. `mock` voltar ao enum de provider de autenticação;
2. runtime flags declararem `authProvider: mock`;
3. a matriz voltar a declarar AUTH híbrido/parcial;
4. `AUTH-B02` ou `AUTH-B04` reaparecerem;
5. os blockers externos forem removidos ou reclassificados como implementação concluída;
6. tokens entrarem no snapshot público;
7. provider mock reaparecer no contrato de identidade;
8. a evidência AUTH-A12 deixar de estar concluída.

## Validação da implementação

Head validado:

`8e05435d8f0abad79db410d6abc564f907d8f913`

- Doke Quality Gates #703: sucesso;
- audit AUTH-001 domain closure: sucesso;
- sessão canônica e audit de autoridade de identidade: sucesso;
- runtimes de retirada das autoridades locais de perfil, onboarding e profissional: sucesso;
- runtime flags e matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #477: sucesso;
- Doke Diagnostic E2E #498: sucesso.

## Supabase

Nenhuma migration foi aplicada.

Nenhuma Edge Function foi criada ou implantada.

Nenhuma configuração, dado, conta ou provider de staging/produção foi alterado.

## Próximo handoff

`PROF-001` pode avançar como próximo domínio técnico central. Isso não promove AUTH-001 para produção: os três blockers externos continuam explícitos e obrigatórios antes do lançamento.

## Segurança

- produção não alterada;
- staging não alterado;
- nenhuma conta real modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum workflow, codemod, hook ou diagnóstico temporário remanescente;
- PR #9 permanece aberto, draft e não mesclado.
