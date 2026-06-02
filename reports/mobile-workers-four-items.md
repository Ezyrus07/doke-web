# Mobile workers count

## Causa raiz

A home ainda renderizava cinco `article.video-card` no trilho de Workers. Apesar de existir regra CSS tentando esconder o quinto item no mobile, o resultado em Safari/iPhone podia continuar exibindo o quinto card dependendo da ordem/cache de CSS aplicado no aparelho.

## Correção

Removido do `index.html` o quinto card visível da seção Workers:

```html
<article class="video-card video-card--five ..." data-worker-id="vid-manutencao"></article>
```

## Responsabilidade

A correção foi feita no HTML da home porque a regra de produto para a vitrine mobile é exibir apenas quatro workers. Não foi criado CSS novo, não foi usado `!important`, não houve alteração de shell/header/sidebar e não houve mudança em JS.

## Arquivos alterados

- `index.html`

## Validação estática

- A seção `#short-videos-track` passa a ter quatro cards visíveis.
- Nenhum arquivo CSS ou JS foi alterado.
