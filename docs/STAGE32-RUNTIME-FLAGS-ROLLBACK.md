# Stage 32 — Runtime Flags e Rollback Seguro

## Objetivo

Adicionar uma camada de segurança para continuar evoluindo o Doke sem repetir regressões grandes em mobile/desktop. Esta etapa não altera layout nem cria CSS global novo. Ela cria kill switches para desligar partes novas da arquitetura em runtime.

## Arquivos adicionados

- `assets/js/core/runtime-config.js`
- `assets/js/core/feature-flags.js`
- `assets/js/core/rollout-guard.js`
- `scripts/audit-runtime-flags.js`
- `docs/validation/runtime-flags-audit-report.md`

## Flags disponíveis

| Flag | Padrão | Função |
|---|---:|---|
| `mobileAppShell` | `true` | Controla montagem do App Shell mobile |
| `controllerBootstrap` | `true` | Controla inicialização dos controllers por página |
| `mockDataControllers` | `true` | Controla carregamento de mocks/domain services nos controllers |
| `authSessionBootstrap` | `true` | Controla bootstrap de sessão/permissões |
| `desktopContracts` | `true` | Reserva para contratos desktop |
| `visualGuards` | `true` | Reserva para guardrails visuais |

## Como desativar sem editar código

Via query string:

```txt
?dokeDisable.mobileAppShell=1
?dokeDisable.controllerBootstrap=1
?dokeSafeMode=1
```

Via localStorage no navegador:

```js
localStorage.setItem('doke.flag.mobileAppShell', 'false')
localStorage.setItem('doke.flag.controllerBootstrap', 'false')
```

Para reativar:

```js
localStorage.removeItem('doke.flag.mobileAppShell')
localStorage.removeItem('doke.flag.controllerBootstrap')
```

## Por que isso importa

Depois das regressões visuais em desktop/mobile, o projeto precisa de uma forma rápida de isolar uma camada nova sem apagar arquivos ou desfazer commits. A partir daqui, componentes estruturais precisam passar por flags quando houver risco de afetar várias páginas.

## Regra técnica

- Alteração global nova deve ter flag ou teste visual.
- App Shell, controllers e mocks não podem ser hard dependency invisível.
- Se uma regressão aparecer em produção/staging, a primeira resposta deve ser desativar a flag afetada e só depois corrigir a causa.
