# Stage 23 — Auth, Session e Permissions Foundation

## Objetivo

Preparar o Doke para lógica real sem acoplar as páginas diretamente ao Supabase/Firebase e sem repetir verificação de login em cada HTML.

Esta etapa não implementa login real de produção. Ela cria a camada de contrato que deve existir antes da lógica final.

## Arquivos criados

```txt
assets/js/core/app-state.js
assets/js/core/permissions.js
assets/js/core/session.js
assets/js/core/page-bootstrap.js
assets/js/services/auth-service.js
scripts/audit-auth-session-contracts.js
```

## Contratos adicionados

### Estado global

`Doke.state` centraliza estado mínimo da aplicação:

```txt
auth.status
auth.user
auth.profile
auth.role
auth.permissions
ui.page
ui.viewport
```

### Sessão

`Doke.session` centraliza leitura, escrita, limpeza e aplicação de sessão.

No momento usa `localStorage` como camada mock/transitória para permitir desenvolvimento sem backend final.

### Permissões

`Doke.permissions` define papéis iniciais:

```txt
guest
client
professional
moderator
admin
```

E permissões base para cada papel.

### Auth service

`Doke.auth` expõe:

```txt
getCurrentUser()
getCurrentSession()
signIn()
signOut()
requireAuth()
requireRole()
```

O `signIn` atual é mockado por design. Quando Supabase Auth for escolhido como fonte única, a implementação troca internamente sem alterar as páginas.

## Proteção aplicada no mobile

O App Shell mobile deixou de usar `position: fixed` no topo. Isso evita que o header fique sticky durante a rolagem.

O shell continua existindo como fonte única do chrome mobile, mas não deve grudar na tela ao rolar.

## Governança

Páginas não devem:

```txt
- verificar role manualmente com código duplicado;
- acessar Supabase/Firebase diretamente;
- esconder/mostrar ações sensíveis sem usar permissions;
- criar session state local próprio.
```

Páginas devem usar:

```txt
Doke.auth
Doke.session
Doke.permissions
Doke.state
```

## Validação

Rodar:

```bash
npm run audit:auth-session
```

ou:

```bash
npm run audit:all
```
