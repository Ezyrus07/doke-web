# Doke — Base Visual Oficial

Este pacote serve como base visual do Doke, com shell principal, auth e home modularizados para facilitar manutenção.

## Estrutura atual

- `index.html`
  - Home principal do shell.
- `dashboard.html`
  - Página interna de referência.
- `templates/page-base.html`
  - Template limpo para começar novas páginas.
- `auth/`
  - Fluxos de login, cadastro e recuperação.

### CSS

- `assets/css/tokens.css`
  - Variáveis oficiais de cor, espaçamento, raio, sombra e dimensões.
- `assets/css/base.css`
  - Reset, tipografia, grids utilitários e base global.
- `assets/css/layout.css`
  - Sidebar, topbar, dropdowns estruturais e responsividade do shell.
- `assets/css/components.css`
  - Botões, inputs, cards, tabelas e componentes reutilizáveis.
- `assets/css/shell-home.css`
  - Apenas fundo e sizing estrutural da home.
- `assets/css/home-sections.css`
  - Categorias, filtros, anúncios, vídeos curtos e antes/depois da home.
- `assets/css/dashboard.css`
  - Ajustes específicos do dashboard.
- `assets/css/auth.css`
  - Layout e componentes das páginas de autenticação.

### JavaScript

- `assets/js/app.js`
  - Interações globais do shell: sidebar, tema, avatar e dropdown de perfil.
- `assets/js/home.js`
  - Interações exclusivas da home: busca e filtros rápidos.
- `assets/js/auth-service.js`
  - Camada de sessão/auth local + integração opcional com Supabase.
- `assets/js/auth.js`
  - Comportamentos das telas de autenticação.
- `assets/js/supabase-config.js`
  - Configuração local do Supabase.

## Regras de organização

1. Não criar CSS global novo quando a regra for específica de uma página.
2. Componentes reutilizáveis vão para `components.css`.
3. Estrutura do shell vai para `layout.css`.
4. Comportamentos exclusivos da home ficam em `home.js`.
5. Cada nova página deve ganhar no máximo um CSS específico, além da base compartilhada.

## Ordem recomendada dos CSS

1. `tokens.css`
2. `base.css`
3. `layout.css`
4. `components.css`
5. CSS específico da página

## Ordem recomendada dos scripts

1. `supabase-config.js`
2. `auth-service.js`
3. `app.js`
4. JS específico da página

## Próximo passo recomendado

Depois de validar a home no desktop, faça a responsividade por página, não só no final do projeto.
