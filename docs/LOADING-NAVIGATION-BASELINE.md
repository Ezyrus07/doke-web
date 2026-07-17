# Baseline final de navegação, carregamento e hidratação

Status: ativo  
Baseline: Lote 18

## Princípio central

A interface não deve usar skeleton como sinônimo de JavaScript inicializando. Cada espera pertence a uma única categoria:

| Categoria | Uso correto | Tratamento visual |
|---|---|---|
| Document boot | Primeiro carregamento real do documento | Preloader global curto, sem duração mínima artificial |
| Route transition | Troca interna pelo stable shell | Shell preservado e commit direto sempre que possível |
| Guard pending | Autenticação, papel ou permissão ainda não resolvidos | Pending compacto; conteúdo protegido oculto |
| Hard-load data miss | Dados remotos desconhecidos e sem cache útil | Skeleton estrutural fiel ao componente final |
| Refresh/revalidation | Conteúdo pronto sendo atualizado | Conteúdo preservado; atualização silenciosa ou indicador regional |
| Mutation | Salvar, enviar, publicar, pagar ou excluir | Loading local na ação; nunca skeleton de página |
| Empty/error | Resultado confirmado ou falha recuperável | Estado explícito após resolução da fonte de dados |

## Regras de fechamento

1. Skeleton de página só pode aparecer em hard load ou cache miss real.
2. Navegação interna não deve reproduzir o preloader documental.
3. `hidden` é autoridade de visibilidade e não pode ser vencido por CSS local.
4. Busca, categorias, filtros e controles estáticos devem aparecer imediatamente.
5. Guards nunca podem revelar conteúdo protegido por um frame.
6. Refresh não pode retornar uma superfície `ready` para `loading` visual global.
7. Não existem durações mínimas artificiais para loaders.
8. Skeletons devem reservar a geometria do componente real, inclusive em mobile.
9. Back/Forward deve reidratar a rota sem desmontar o shell.
10. Falha de dependência de teste visual deve ser registrada como teste não executado, não confundida com regressão funcional.

## Matriz resumida por rota

| Rotas | Política |
|---|---|
| `ajuda`, `novidades` | Conteúdo imediato; sem skeleton |
| `configuracoes`, `orcamento`, `avaliacao-profissional`, `tornar-profissional`, `verificacao-profissional`, `anunciar-servico` | Pending de contexto/guard; sem skeleton falso |
| `admin`, `admin-verificacao`, `comunidade-interna` | Guard pending protegido; conteúdo oculto até autorização |
| `index`, `mensagens`, `notificacoes`, `pedidos`, `carteira`, `resultados`, `detalhe-anuncio`, `pagamento-profissional` | Skeleton somente em hard load; commit direto interno; ready preservado em revalidação |
| `meu-perfil`, `perfil-cliente`, `perfil-profissional` | Skeleton somente em hard load; guard e dados revalidados sem desmontar conteúdo pronto |
| `comunidade` | Skeleton documental legítimo; navegação interna direta |

## Gates obrigatórios

- `test-first-paint-loading-contract.js`
- `test-global-document-preloader-contract.js`
- `test-loader-latency-contract.js`
- `test-loader-taxonomy-consolidation-contract.js`
- `test-loader-visibility-safety-contract.js`
- `test-home-skeleton-fidelity-contract.js`
- `test-results-wallet-skeleton-fidelity-contract.js`
- `test-messages-orders-skeleton-fidelity-contract.js`
- `test-detail-payment-skeleton-fidelity-contract.js`
- `test-profile-settings-navigation-lifecycle-contract.js`
- `audit-navigation-lifecycle-contract.js --strict`
- `audit-final-loading-baseline.js`

## Validação visual ainda necessária no ambiente do produto

Executar com cache vazio e rede lenta em desktop, tablet e mobile:

- F5 nas rotas dinâmicas principais;
- navegação interna repetida;
- Back/Forward;
- troca rápida de rotas;
- ausência de skeleton + conteúdo simultâneos;
- ausência de flash de conteúdo protegido;
- transição skeleton → conteúdo sem layout shift relevante.
