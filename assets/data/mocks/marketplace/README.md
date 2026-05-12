# Marketplace mock boundary

Fixtures temporárias para cards/listas de marketplace: serviços, Workers, publicações e avaliações.

## Regras

- Não colocar dados reais de usuários.
- Manter IDs estáveis para testes e demos.
- Não acoplar CSS/HTML ao conteúdo específico desses arquivos.
- Renderers consomem objetos já carregados; eles não fazem `fetch`, Supabase, Firebase ou `localStorage`.
- Quando o backend entrar, substituir a origem por repositories/adapters sem reescrever os componentes.

## Coleções

- `services.json`
- `workers.json`
- `publications.json`
- `reviews.json`
- `manifest.json`
