# CAT-001 / CAT-A05 — Candidato de reconciliação final

## Status

`RECONCILIATION CANDIDATE — CI PENDING`

Este sublote não declara o CAT-001 encerrado. Ele consolida o estado técnico já comprovado e cria um gate permanente contra fechamento documental prematuro.

## Por que este gate é necessário

CAT-A04 e CAT-B04 já possuem implementação e validações específicas no staging, mas as cinco lanes canônicas ainda não apresentam resultado observável no mesmo head estável:

1. Quality;
2. E2E bloqueante;
3. 105 guards visuais;
4. Canary;
5. Diagnostic.

Sem essa convergência, não é correto:

- remover `CAT-B04` da matriz;
- classificar CAT-A04 como formalmente encerrado;
- alterar `productionGate` de `blocked`;
- marcar o PR como pronto;
- mesclar o PR.

## Estado acumulado do domínio

### CAT-A01 — baseline de autoridade

Concluído. O catálogo público aprovado, o versionamento e a moderação server-side foram congelados como autoridades canônicas.

### CAT-A02 — retirada da autoridade persistente do navegador

Concluído. Sessões Supabase e sujeitos UUID não podem usar `localStorage` como segunda autoridade de serviços. Fixtures não UUID permanecem somente em memória no runtime atual.

### CAT-A03 — edição e ciclo de vida server-side

Concluído. Edições de conteúdo passam por nova versão moderada; pausa, reativação e arquivamento passam por operação server-side explícita.

### CAT-A04 — lifecycle de mídia

Tecnicamente concluído, CI pendente.

- uploads reais exigem reserva imutável e URL assinada;
- `upsert` e caminhos previsíveis não são autoridade do fluxo real;
- consumo do intent é único;
- limpeza exige prova de ausência de referências;
- claim, retry e deleção via Storage API são server-side;
- a service layer não chama mais o submit legado do repository.

O helper legado morto ainda existe fisicamente em `services-repository.js`, mas não é alcançável pela camada de negócio e as autoridades remotas falham fechado.

### CAT-B04 — snapshot imutável do anúncio no pedido

Candidato validado, CI pendente.

- `orders.service_version_id` congela a versão aprovada;
- `orders.service_snapshot` guarda o snapshot canônico;
- trigger PostgreSQL substitui profissional e snapshot enviados pelo cliente;
- alteração posterior da versão, profissional, snapshot ou projeção histórica é bloqueada;
- pedidos antigos permanecem ligados à versão contratada mesmo após nova aprovação do anúncio;
- SQL 021 passou integralmente em `BEGIN/ROLLBACK`;
- nenhum usuário, serviço, versão ou pedido sintético permaneceu no staging.

## Gate permanente CAT-A05

`scripts/audit-cat-domain-closure-candidate.js` verifica:

- presença de todas as evidências CAT-A01 até CAT-B04;
- presença das migrations 149–157 e SQLs 018–021;
- CAT-A04 ainda classificado como `TECHNICALLY_COMPLETE_CI_PENDING`;
- CAT-B04 ainda classificado como `CANDIDATE_VALIDATED_CI_PENDING`;
- CAT-A05 ainda classificado como candidato CI-pendente;
- `CAT-B04` ainda presente nos blockers da matriz;
- `productionGate` ainda igual a `blocked`;
- autoridade do catálogo ainda `remote/canonical`;
- todos os cinco resultados de CI ainda explicitamente pendentes enquanto não forem observáveis;
- produção, dados reais e estado draft/unmerged preservados.

Se alguém tentar declarar o domínio concluído alterando somente documentação, o audit falhará.

## Estado do PR no início deste candidato

- repositório: `Ezyrus07/doke-web`;
- branch: `cat/cat-001-baseline-audit`;
- PR: `#12`;
- base: `prof/prof-001-baseline-audit`;
- head anterior: `659d74c37cc30a8073fa69f58165742f559cf8d5`;
- PR aberto;
- PR draft;
- PR não mesclado;
- PR mergeável.

O PR pai `#11` permanece aberto, draft e não mesclado.

## Segurança operacional

- produção não alterada;
- nenhuma conta real modificada;
- nenhum pedido real criado ou alterado;
- nenhuma entidade sintética persistente criada;
- nenhuma configuração paga, SMS ou OAuth habilitada;
- PR não marcado como pronto;
- nenhum merge executado.

## Condição para o fechamento real

Somente depois de Quality, E2E bloqueante, 105 guards visuais, Canary e Diagnostic passarem no mesmo head estável:

1. atualizar as evidências CAT-A04, CAT-B04 e CAT-A05 com runs e heads verificáveis;
2. acrescentar as entradas finais ao diário de engenharia;
3. remover `CAT-B04` dos blockers;
4. atualizar a matriz machine-readable;
5. regenerar a matriz humana determinística;
6. atualizar a descrição do PR;
7. manter o PR draft e não mesclado até autorização explícita do usuário.

## O que este sublote muda no produto

Não muda a interface visível neste momento. Ele impede que a equipe trate o catálogo como concluído antes de comprovar que upload, limpeza de mídia e snapshots históricos funcionam juntos sem regressão.

Isso protege a Doke contra um fechamento administrativo falso: o site só avança para o próximo domínio quando a infraestrutura que sustenta anúncios e pedidos estiver comprovadamente consistente.

## Final reconciliation — COMPLETE

- validated head: `09e77e5236d2bc0c820d73768f0161f326adeefe`;
- Quality #1237 / run `30357055694`: success;
- blocking E2E job `90267805123`: success;
- 105 visual structural guards job `90267805237`: success;
- Canary #806 / run `30357055735`: success;
- Diagnostic #901 / run `30357055726`: success;
- production unchanged; PR #12 and parent PR #11 remain draft, open and unmerged.

Only `CAT-B04` was removed. Maturity remains 4, security remains partial and production remains blocked.
