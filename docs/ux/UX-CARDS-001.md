# UX-CARDS-001 — Card authority, identity provenance and media geometry

## Status

- Frente: `UX-IMPLEMENTATION`
- Branch: `ux/ux-cards-001-card-authority`
- Base: `ux/ux-perf-001-loading-budgets`
- Base head: `f5e686423b5149876ff2c38d23ba2945272721fa`
- Issue: `#62`
- Piloto: Novidades
- HTML, backend e migrations: não alterados
- Home: baseline visual preservado
- Staging e produção: não acessados
- Merge, ready-for-review e auto-merge: não autorizados

## Objetivo

Criar uma autoridade única para contratos semânticos de cards sem substituir renderers de domínio existentes.

A autoridade deve responder de forma determinística:

```text
qual é o tipo do card
qual autoridade sustenta o conteúdo
qual é a situação da identidade apresentada
se a alegação de verificação possui prova
qual é o papel de cada badge
qual geometria existe antes da mídia carregar
qual lote entra no primeiro render
```

## Causa raiz

A Doke já possui anúncios, cards editoriais, profissionais, workers e publicações. Porém, os renderers recebem campos heterogêneos e não compartilham um contrato transversal de proveniência.

Riscos:

```text
verified: true
→ tratado localmente como prova suficiente
```

```text
badge "Publicado"
→ confundido com selo de identidade
```

```text
imagem sem dimensões intrínsecas
→ layout shift depois do download
```

A solução não é criar outro card visual. É criar normalização canônica para ser adotada progressivamente.

## Autoridade

```text
Doke.cardExperience
runtime: 20260804-ux-cards-001-v1
contract: card-contract-v1
```

A API e os enums publicados são congelados.

## Tipos de card

```text
SERVICE
PROFESSIONAL
EDITORIAL
PUBLICATION
BEFORE_AFTER
WORKER
UNKNOWN
```

## Autoridades de conteúdo

```text
REMOTE_CATALOG
SERVER_RECONCILED
PLATFORM_EDITORIAL
LOCAL_FIXTURE
USER_GENERATED
UNKNOWN
```

A authority do card não equivale automaticamente à proveniência da identidade dentro dele.

## Estados de identidade

```text
NOT_APPLICABLE
UNKNOWN
DECLARED
PROFILE_LINKED
VERIFIED
DISPUTED
```

## Estados de verificação

```text
NOT_APPLICABLE
UNVERIFIED
UNPROVEN
VERIFIED
DISPUTED
UNKNOWN
```

Regra central:

```text
booleano local de verificação
≠ prova de verificação
```

Um claim visual só é elegível quando existem simultaneamente:

```text
claim solicitado
+
status verified/approved
+
proveniência confiável
```

Caso algum requisito falhe, nenhum badge de identidade é produzido.

## Proveniência

```text
NONE
SELF_DECLARED
PROFILE_SNAPSHOT
PROFESSIONAL_VERIFICATION_AUTHORITY
SERVER_ATTESTED
KYC_REVIEWED
UNKNOWN
```

Allowlist confiável:

```text
PROFESSIONAL_VERIFICATION_AUTHORITY
SERVER_ATTESTED
KYC_REVIEWED
```

Tabela de decisão:

| Claim | Status | Proveniência | Resultado |
|---|---|---|---|
| não | qualquer | qualquer | `UNVERIFIED` ou `NOT_APPLICABLE` |
| sim | ausente | qualquer | `UNPROVEN` |
| sim | verified | `SELF_DECLARED` | `UNPROVEN` |
| sim | verified | `PROFILE_SNAPSHOT` | `UNPROVEN` |
| sim | verified | trusted | `VERIFIED` |
| sim | disputed | trusted | `DISPUTED` |

A implementação é fail-closed.

## Badges

Tipos semânticos:

```text
CONTENT_CATEGORY
LISTING_STATUS
IDENTITY_VERIFICATION
OPERATIONAL_STATUS
EDITORIAL_LABEL
```

Regras:

- categoria não pode ser anunciada como verificação;
- `Publicado` informa o anúncio, não a pessoa;
- identidade verificada depende do claim normalizado;
- badges existentes podem ser anotados sem receber novo visual;
- o piloto de Novidades classifica apenas badges editoriais existentes.

APIs:

```text
annotateBadge(node, kind, authority)
createVerificationBadge(identity)
```

`createVerificationBadge` retorna `null` quando a prova é insuficiente.

## Mídia

Estados:

```text
EMPTY
RESERVED
LOADING
READY
ERROR
```

Prioridades:

```text
CRITICAL
IMPORTANT
OPTIONAL
```

O contrato define largura, altura, aspect ratio, loading, fetch priority, decoding e lifecycle.

Defaults:

```text
width: 640
height: 400
aspect ratio: 8 / 5
```

Fluxo:

```text
sem URL → EMPTY
URL conhecida → RESERVED
request em andamento → LOADING
load concluído → READY
erro → ERROR
```

A reserva de geometria evita layout shift sem esconder conteúdo válido.

## Progressive rendering

API:

```text
createRenderPlan(items, { initialCount })
```

Tiers:

```text
INITIAL
DEFERRED
```

Invariantes:

- ordem original preservada;
- nenhum item duplicado;
- initial e deferred determinísticos;
- a função não decide ranking;
- o renderer proprietário controla a revelação.

## Service cards

A API inclui:

```text
normalizeServiceCard(service, options)
```

Ela normaliza kind, authority, fingerprint, identity claim, status, media e render tier.

Este PR não altera `public-service-card.js`, `ad-card.css` ou a Home. A autoridade fica disponível para migração controlada posterior, depois de validação visual e compatibilidade com catálogo e favoritos.

## Cards editoriais

API:

```text
normalizeEditorialCard(input, options)
```

Contrato:

```text
kind: EDITORIAL
authority: PLATFORM_EDITORIAL
identity: NOT_APPLICABLE
verification: NOT_APPLICABLE
```

Conteúdo editorial não recebe identidade humana verificada por inferência.

## Piloto — Novidades

```text
Doke.newsCardPilot
version: 20260804-ux-cards-001-news-v1
```

Superfícies:

```text
.news-feature
[data-news-card]
[data-news-important-card]
```

O piloto:

- anota kind e authority;
- adiciona fingerprint opaco;
- classifica badges como `CONTENT_CATEGORY`;
- atribui render tier;
- publica somente contagens sanitizadas;
- reaplica o contrato depois de route-ready.

O piloto não muda texto, não cria selo, não esconde, não reordena e não altera classes visuais existentes.

## Bootstrap

`page-bootstrap.js` carrega `Doke.cardExperience` em paralelo com performance e demais capacidades.

O piloto só é carregado quando:

```text
pageName() === "novidades"
```

Readiness:

```text
cardExperienceReady
cardPilotReady
```

Falha da autoridade mantém os componentes legados e não produz claims adicionais.

## CSS

Arquivo:

```text
assets/css/core/card-experience.css
```

Escopo opt-in:

- badge criado pela autoridade;
- imagens com `data-doke-card-image`;
- forced colors;
- reduced motion.

Restrições:

- sem `!important`;
- sem seletores `.doke-ad-card`;
- sem redefinir anatomia da Home;
- sem overflow global escondido;
- sem alteração de tokens.

## Telemetry e privacidade

Evento:

```text
doke:card-experience
```

São publicados somente kind, authority, estados normalizados, fingerprint opaco, contagens, render tier e media state.

Não são publicados nomes, títulos, URLs, IDs brutos, localização, preço, account ID ou payload do card.

## Validação

O gate executa:

- sintaxe;
- API e enums congelados;
- authority normalization;
- `verified: true` isolado permanecendo `UNPROVEN`;
- status + proveniência confiável produzindo `VERIFIED`;
- disputed permanecendo disputed;
- criação e recusa de badge;
- categoria/status separados de identidade;
- dimensões e lifecycle de mídia;
- render plan determinístico;
- telemetry sem conteúdo bruto;
- piloto de Novidades;
- bootstrap seletivo;
- catálogo público preservado;
- loading baseline sem dívida nova;
- regressões PERF, RESP, A11Y, NAV, PRIV, CONT, CORE-002 e CORE-001;
- auditores de navegação e auth/session;
- `git diff --check`.

## Fora do escopo

- redesenhar `doke-ad-card`;
- alterar Home ou Resultados;
- migrar o provider card do Detalhe;
- validar KYC no navegador;
- criar autoridade remota;
- alterar favoritos ou ranking;
- modificar catálogo ou upload de mídia;
- criar analytics remoto;
- acessar staging ou produção.

A migração de claims booleanos antigos exige um sublote próprio conectado à autoridade real de verificação profissional.

## Rollback

1. remover `card-experience.js` e seu CSS;
2. remover `news-card-pilot.js`;
3. restaurar `page-bootstrap.js` ao head do UX-PERF-001;
4. remover teste, workflow e documento.

Nenhum dado remoto, storage, schema ou migration precisa ser revertido.

## Próximo sublote

```text
UX-SEARCH-001
— search state machine
— latest-wins requests
— authority disclosure
— URL, retry e empty contracts
```
