# Doke Frontend Component Contracts

Páginas não redesenham componentes. Página controla apenas espaçamento externo e composição. Dimensões internas, cores, border-radius, estados e ícones pertencem aos arquivos em `assets/css/components/`.

## Criados nesta etapa

- `assets/css/components/navigation/app-mobile-topbar.css`: avatar, saudação, localização e notificação mobile.
- `assets/css/components/navigation/app-mobile-search.css`: altura, grid, placeholder, ícones, microfone e botão de filtro mobile.

Ao migrar uma nova página, preserve atributos JS (`data-*`) e adicione as classes `app-*`. Classes antigas podem ficar temporariamente como alias de compatibilidade, mas não devem receber novos estilos.
