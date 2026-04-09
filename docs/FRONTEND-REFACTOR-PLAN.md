# Doke frontend refactor plan

## Objetivo
Preparar a base atual para:
- padronização desktop + mobile
- entrada futura de lógica JS real
- menor acoplamento entre páginas
- manutenção previsível

## Princípios
1. Não quebrar páginas ativas por refatoração prematura.
2. Tirar responsabilidade de arquivos monolíticos aos poucos.
3. Todo componente reutilizado em 3+ páginas sai de `pages/`.
4. `pages/*.js` vira bootstrap; comportamento vai para `features/`.
5. Mock não fica embutido em render principal.

## Fase 1 — fundação sem risco
### Entregas
- criar `assets/css/components/`
- criar `assets/js/features/`, `services/`, `state/`, `utils/`
- documentar owners de shell, cards, tabs e perfil
- adicionar auditoria automática básica

### Meta
Não mudar comportamento visual ainda. Só abrir a arquitetura certa.

## Fase 2 — consolidação do shell
### Prioridade
- sidebar
- topbar
- header interno
- cards-base
- tabs-base

### Regra
Nada de página puxando CSS de outra página para sobreviver.

## Fase 3 — mobile system real
### Prioridade
- shell mobile
- topbars mobile
- tabs compactas
- cards com escala consistente
- grids/listas com breakpoints previsíveis

### Regra
Mobile deve nascer junto da componentização, não depois.

## Fase 4 — features
### Ordem sugerida
1. perfil
2. notificações
3. mensagens
4. pedidos
5. busca/resultados

## Fase 5 — integração futura
### Preparação
- `services/` para Supabase/Firebase/API
- `state/` para estados de UI e domínio
- `assets/data/mocks/` para fixtures desacopladas

## Critérios de pronto
- shell compartilhado estável
- tabs compartilhadas estáveis
- cards compartilhados estáveis
- páginas internas não dependem de `home.css` sem necessidade
- arquivos grandes começam a perder responsabilidade


## Round 1 implemented
- `perfil.html` no longer imports `home.css`; it now consumes `internal-shell.css` for inner-page workspace behavior.
- Shared inner-page workspace rules moved to `assets/css/components/shell/internal-workspace.css`.
- Shared compact profile tabs moved to `assets/css/components/tabs/profile-tabs.css`.
- Profile mock payload moved to `assets/data/mocks/profile-data.js`.
- Profile tab/share behavior extracted into `assets/js/features/profile/`.
