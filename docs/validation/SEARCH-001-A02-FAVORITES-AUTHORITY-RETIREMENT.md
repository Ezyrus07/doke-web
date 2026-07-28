# SEARCH-001 / SEARCH-A02 — AUTORIDADE LOCAL RETIRADA

## Resultado

A persistência de favoritos em `localStorage` foi retirada do fluxo do detalhe do anúncio.

A autoridade real passa a ser:

`public.favorites`

protegida pelas policies owner-scoped já existentes em staging.

## Nova fronteira

O fluxo foi separado em três camadas:

1. `assets/js/repositories/favorites-repository.js`
   - única camada de persistência;
   - consulta, adiciona e remove em `public.favorites`;
   - aplica fail-closed para sessões Supabase e sujeitos UUID;
   - mantém fixtures não UUID somente em memória durante o runtime atual.

2. `assets/js/services/favorites-service.js`
   - fronteira consumida pelas páginas;
   - não conhece UI nem acessa Storage do navegador.

3. `assets/js/pages/detail-ad-experience.js`
   - coordena estado visual, autenticação e eventos;
   - não chama Supabase diretamente;
   - não contém `localStorage`, `sessionStorage` ou a chave aposentada.

O carregamento ocorre explicitamente na ordem:

`favorites-repository → favorites-service → detail-ad-experience`

antes da publicação dos dados do anúncio.

## Comportamento

### Usuário autenticado real

- leitura usa `SELECT` owner-scoped;
- salvar usa `INSERT` com `user_id` e `service_id` canônicos;
- remover usa `DELETE` limitado por usuário e serviço;
- duplicidade PostgreSQL `23505` é tratada como sucesso idempotente;
- indisponibilidade remota gera `DOKE_FAVORITES_AUTHORITY_UNAVAILABLE`;
- nenhum fallback persistente é aberto.

### Usuário não autenticado

Uma tentativa de salvar gera:

`DOKE_FAVORITES_AUTH_REQUIRED`

A página encaminha para o login preservando a URL de retorno.

### Fixture não UUID

A compatibilidade de testes permanece `runtime-memory-only`.

Ela desaparece ao recarregar a aplicação e nunca pode mascarar uma sessão Supabase ou um identificador UUID.

## Staging

A inspeção foi somente leitura e confirmou:

- RLS habilitada;
- três policies por proprietário;
- `anon` sem leitura;
- `authenticated` com `SELECT`, `INSERT` e `DELETE`;
- zero favoritos persistidos no momento da inspeção.

Nenhuma migration foi necessária e nenhum dado foi alterado.

## Testes permanentes

O runtime cobre:

- adicionar, listar, consultar e remover em fixture de memória;
- `SELECT`, `INSERT` e `DELETE` remotos com identidade canônica;
- mutação anônima bloqueada;
- indisponibilidade remota falhando fechado;
- ausência de `localStorage` e da chave aposentada;
- ordem determinística de carregamento dos módulos.

## Matriz

`SEARCH-B01` permanece temporariamente na matriz 1.3.9 até a validação CI e a reconciliação documental.

A descrição antiga — “favorites has RLS disabled” — não corresponde mais ao staging. A futura reconciliação deve registrar que o risco controlado era a autoridade executável no navegador, agora retirada.

A maturidade do SEARCH-001 continua em nível 2 e a produção permanece bloqueada.

## Segurança operacional

- staging não alterado;
- produção não alterada;
- nenhuma conta real alterada;
- nenhum favorito real criado ou removido;
- nenhuma entidade sintética persistente criada;
- nenhum recurso pago, SMS ou OAuth habilitado;
- PR #21 permanece draft, aberto e não mesclado;
- PRs pais permanecem draft, abertos e não mesclados.

## Próximo passo

Validar SEARCH-A02 em um head estável e reconciliar somente `SEARCH-B01`. Em seguida, expandir a mesma autoridade para todos os cards e iniciar a busca server-side limitada e paginada.
