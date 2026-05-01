# Doke — Estrutura ideal de produto e engenharia

Este arquivo define a direção estrutural para o Doke evoluir de site estático para uma plataforma escalável.

## Regra principal
Nenhuma página deve redesenhar componentes globais. Páginas montam conteúdo; componentes globais controlam aparência, comportamento e acessibilidade.

## Camadas
1. `assets/` — código atual em produção estática.
2. `src/` — estrutura-alvo para migração gradual para aplicação modular.
3. `backend/` — estrutura-alvo de domínio/API/workers.
4. `supabase/` — banco, policies, migrations e seeds.
5. `tests/` — testes unitários, integração, e2e, visuais e acessibilidade.
6. `docs/` — decisões, contratos, governança e playbooks.

## Estratégia
- Primeiro estabilizar visual e componentes.
- Depois migrar lógica por feature.
- Depois trocar páginas estáticas por rotas/componentes.
- Depois escalar backend, busca, pagamentos, moderação e observabilidade.
