# UX-HOME-002 — More services intent filters and progressive reveal

## Status

- issue: #85;
- branch: `ux/ux-home-002-more-services-filters`;
- base: `ux/ux-home-001-rail-states`;
- base SHA: `47cd16434beb2f63c10adce3ebe8d15052e1f52c`;
- PR: #86, aberto e draft;
- merge: não autorizado;
- staging/produção: não acessados.

## Causa raiz

A superfície `Mais anúncios` já renderizava a coleção canônica `services.slice(6)`, mas seus controles não compartilhavam uma autoridade funcional:

1. as `.mini-tab` de `home.js` apenas alternavam `is-active`/`aria-pressed`;
2. o painel abria/fechava, mas `Aplicar filtros` não comprometia snapshot aplicado nem re-renderizava a coleção;
3. o progressive reveal operava sobre cards já presentes no DOM, sem relação explícita com intent/filtros aplicados;
4. o catálogo preserva metadata verificável para categoria, localização, rating, garantia, emergência, online, disponibilidade e timestamps;
5. não existe autoridade canônica de following para a Home, portanto `Seguindo` não pode inferir resultados de favoritos, histórico ou provider IDs.

Durante a integração em browser foi encontrada uma segunda causa raiz: o rail recebia `data-more-services-intent` como diagnóstico enquanto o event routing usava `closest('[data-more-services-intent], ...')`. Assim, qualquer clique interno podia resolver o próprio rail como se fosse uma tab e interromper a propagação antes dos filtros. O contrato foi separado:

- tabs: `role="tab"` + `data-more-services-intent`;
- rail: `data-more-services-active-intent`.

O painel de filtros também é portável para `document.body` no mobile. Por isso sua autoridade de eventos/draft passou a pertencer ao próprio nó `[data-more-filters-panel]`, e não ao rail que pode deixar de ser seu ancestral.

## Fronteira arquitetural

UX-HOME-002 adiciona autoridade de apresentação apenas para `more-services`. Não substitui:

- `Doke.homeRailState`;
- `Doke.publicServiceCard`;
- `Doke.services.services` / services repository;
- UX-FILTERS-001 em `resultados.html`;
- SEARCH-UX02.

O contrato da Home governa somente:

```text
source collection
+ selected intent
+ draft filters
+ applied filters
+ filtered collection
+ visibleCount
+ generation
+ sanitized presentation receipt
```

## Implementação

### Fase 1 — autoridade pura

`assets/js/pages/home/more-services-state.js` publica `Doke.homeMoreServicesState` com:

- snapshots imutáveis;
- `draftFilters` e `appliedFilters` distintos;
- intents explícitos;
- progressive reveal 6 + 3;
- reset de reveal em mudança de source/intent/applied filters;
- eventos sanitizados;
- `Seguindo` fail-closed.

Checkpoint limpo da fundação:

- SHA `8483e77afeaa504d04c3a5fc16f523638a194a06`;
- trusted run `31197483201`;
- Sonar Quality Gate: passed;
- 0 new issues, 0 accepted issues, 0 Security Hotspots;
- 94,0% Coverage on New Code.

### Fase 2 — surface e runtime da Home

`assets/js/pages/home/more-services-surface.js`:

- aceita apenas payload fresh já aprovado pelo UX-HOME-001;
- deriva `more-services` depois dos seis destaques;
- reutiliza `Doke.publicServiceCard`;
- usa `Doke.listState` para ready/empty/unavailable;
- preserva source aceito quando o rail está stale;
- desativa filtros sem autoridade verificável;
- mantém painel como autoridade de draft mesmo quando portalizado no mobile;
- captura tabs e `Carregar mais` no rail;
- captura quick filters/apply/reset/cancel no próprio painel;
- neutraliza o progressive reveal legado antes de renderizar a coleção aplicada.

O `index.html` carrega, em ordem:

```text
list-state
→ more-services-state
→ more-services-surface
→ index-data-controller
```

As seis tabs possuem intents estáveis e ARIA explícita. O falso estado inicial `Com garantia` foi removido.

## Intent contract

| Intent | Autoridade | Regra |
|---|---|---|
| Para você | ordem canônica recebida | preservar ordem; sem ranking inventado |
| Seguindo | unresolved | unavailable até existir autoridade canônica |
| Bem avaliados | metadata do item | rating real > 0, ordenação determinística |
| Com garantia | metadata do item | `guaranteed === true` |
| Disponíveis hoje | metadata do item | `availableToday === true` |
| Novos | timestamps canônicos | ordenar `createdAt`/`updatedAt`; sem fabricar recência |

## Filter contract

Suportados somente quando respaldados por campo canônico/metadata:

- categoria;
- estado;
- cidade;
- bairro;
- avaliação mínima;
- garantia positiva;
- emergência positiva;
- online;
- disponibilidade hoje.

Sem autoridade verificada neste sublote e portanto fail-closed/desabilitados:

- Pix/pagamentos;
- tipo de serviço;
- faixa de preço;
- modalidade negativa/híbrida;
- `sem garantia`;
- `não atende emergência`.

Draft não altera cards até `Aplicar filtros`. Fechar/cancelar restaura o snapshot aplicado.

## Progressive reveal contract

- mudança de source/intent/filtros aplicados volta ao limite inicial;
- `Carregar mais` revela somente a coleção filtrada atual;
- nenhum card fora da coleção aplicada pode aparecer por reveal;
- 0 itens -> empty/unavailable conforme autoridade;
- 1..6 -> todos visíveis e botão oculto;
- 7+ -> slice inicial + passos determinísticos;
- route re-init não reutiliza reveal antigo.

## Testes permanentes

- `scripts/test-ux-home-002-more-services-state.js`;
- `scripts/test-ux-home-002-more-services-surface.js`;
- `scripts/test-ux-home-002-index-contract.js`;
- `scripts/test-ux-home-002-browser-contract.js`.

Eles cobrem:

- seis intents;
- `Seguindo` fail-closed;
- draft/applied/cancel/reset;
- filtros combinados;
- filtros sem autoridade desabilitados;
- progressive reveal;
- canonical card reuse;
- stale source preservation;
- painel portável;
- ARIA e ordem de scripts;
- eventos sanitizados.

O browser contract permanece obrigatório antes do fechamento, especificamente para validar o event routing em DOM real após a separação `tab intent` versus `rail active intent`.

## Acessibilidade

- tabs usam identificadores estáveis;
- seleção publica `aria-selected` e `aria-pressed` de forma consistente;
- `Seguindo` informa indisponibilidade sem simular resultado;
- filtros suportados permanecem operáveis por teclado;
- filtros não suportados ficam desabilitados;
- contagem é anunciada em live region sem IDs ou dados pessoais.

## Eventos

Eventos podem conter somente:

```text
intent
activeFilterCount
resultCount
visibleCount
generation
availability state
```

Não expor service IDs, provider IDs, user IDs, histórico/query privada ou mensagem técnica.

## Fora de escopo

- setas / scroll synchronization;
- following backend/repository/RPC;
- ranking global da busca;
- migrations ou Supabase;
- redesign/reordenação;
- anatomia de cards;
- staging, produção ou merge.

## Rollback

A entrega permanece aditiva na camada de apresentação. Remover `more-services-state.js`, `more-services-surface.js` e restaurar os atributos/scripts do `index.html` recupera o comportamento anterior sem migration nem reparo de dados persistidos.

## Checkpoint atual

A correção do roteamento ambíguo foi publicada e os executores temporários foram removidos. Este documento dispara a validação completa no head limpo. A issue #85 só pode ser encerrada após browser contract, regressões herdadas, LCOV e Sonar passarem no mesmo SHA final.
