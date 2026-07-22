# Arquitetura frontend Doke

Este é o mapa vivo da arquitetura. Documentos de fase podem existir temporariamente, mas este arquivo deve concentrar as decisões permanentes.

## Camadas

```txt
core        -> tokens, reset, tipografia, layout base, utilitários
components  -> botões, cards, inputs, modais, avatars, shell, header
patterns    -> rails, feeds, listas e composições reutilizáveis
pages       -> layout específico de cada HTML
js/core     -> roteador, estado inicial, sessão, clients baixos
js/services -> fronteira de dados e repositórios
js/controllers -> orquestração de páginas
js/renderers -> renderização DOM a partir de dados prontos
js/pages    -> comportamento específico de página
js/state    -> containers/contratos de estado
```

## Regra de autoridade

- CSS global não deve resolver problema específico de página sem escopo explícito.
- Página controla layout contextual, não anatomia interna de componente.
- Componente controla aparência interna e estados próprios.
- Pattern controla composição reutilizável.
- Shell/header/rail/scroll são autoridades globais sensíveis e exigem validação visual.

## Fluxo data-ready futuro

```txt
backend/API/Supabase/Firebase
  -> service/repository
  -> controller
  -> renderer/component
  -> DOM
```

Lógica nova deve preservar HTML fallback e não pode duplicar estrutura visual já existente.

## Autoridade de conclusão dos domínios

A arquitetura técnica e a ordem de conclusão da plataforma são rastreadas por quatro artefatos complementares:

```txt
config/domain-completion-matrix.json
  -> scripts/audit-domain-completion-matrix.js
  -> reports/generated/domain-completion-matrix-report.json
  -> docs/DOMAIN-COMPLETION-MATRIX.md
```

- O JSON é a autoridade machine-readable de domínio, dependências, maturidade, bloqueadores e gates.
- O relatório gerado contém a evidência estática observada no repositório.
- O documento Markdown é a leitura humana e não deve ser editado manualmente.
- `docs/validation/domain-completion-staging-snapshot.json` é um snapshot pontual; deve ser atualizado após mudanças relevantes de schema, grants, Realtime, Storage, Edge Functions ou crons.
- Relatórios históricos não promovem maturidade sozinhos. O runtime ativo e o staging atual prevalecem.
- Nenhum domínio pode ser marcado como beta ou produção sem cumprir o gate comum e seu gate específico.


## Identity authority boundary

Account authorization is split deliberately:

- Supabase Auth owns credentials and sessions;
- `public.users` owns role, status and onboarding authority;
- `auth.users.raw_app_meta_data` is a server-maintained projection for tokens;
- `public.user_profiles` contains the intentionally public presentation profile;
- `raw_user_meta_data` may contain presentation preferences but never authorization claims.

The browser has no direct DML authority over `users` or `user_profiles`. Self-service mutations cross validated RPC boundaries, and new accounts are materialized by a private trigger as `client`.
