# renderers

Camada de renderização de componentes do Doke.

Objetivo: permitir que cards e listas hoje mockados no HTML sejam alimentados futuramente por `assets/data`, Supabase, Firebase ou outro backend sem reescrever a estrutura visual.

Regras:
- renderers não buscam dados;
- renderers não conhecem páginas;
- páginas passam dados normalizados;
- componentes usam `data-*` previsíveis para preenchimento;
- CSS não deve depender de conteúdo mockado.
