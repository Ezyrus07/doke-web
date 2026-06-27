# Doke Web — Checklist final de QA visual no Live Server

Este checklist deve ser executado no pacote P20-P22 ou posterior, usando VS Code + Live Server.

## Como rodar

1. Extraia o ZIP completo.
2. Abra a pasta no VS Code.
3. Inicie o Live Server a partir de `index.html`.
4. Teste com DevTools nos breakpoints abaixo.
5. Capture prints apenas dos problemas reais encontrados.

## Breakpoints obrigatórios

| Perfil | Tamanho |
|---|---:|
| Mobile base | `390 x 844` |
| Tablet vertical | `820 x 1180` |
| Tablet horizontal | `1024 x 768` |
| Desktop | `1366 x 768` |

## Telas prioritárias

1. `index.html`
2. `resultados.html`
3. `detalhe-anuncio.html`
4. `orcamento.html`
5. `pedidos.html`
6. `mensagens.html`
7. `notificacoes.html`
8. `configuracoes.html`
9. `perfil.html`
10. `perfil-cliente.html`
11. `perfil-profissional.html`
12. `comunidade.html`
13. `comunidade-interna.html`
14. `anunciar-servico.html`
15. `tornar-profissional.html`
16. `pagamento-profissional.html`
17. `auth/login.html`
18. `auth/cadastro.html`
19. `auth/esqueci-senha.html`

## O que procurar

### Shell/header/rail

- Header e conteúdo começam no mesmo rail horizontal.
- Tablet vertical não tem scroll horizontal.
- Tablet horizontal mantém sidebar quando houver espaço.
- Mobile não mostra header duplicado.
- Bottom nav não cobre ações importantes.

### Cards e listas

- Cards não mudam de altura de forma brusca depois do carregamento.
- Avatares continuam circulares.
- Botões `Ver todos`, `Carregar mais` e CTAs não ficam cortados.
- Carrosséis mantêm prévia lateral quando esse é o padrão da tela.

### Formulários

- Inputs, selects e textareas têm altura e borda consistentes.
- Selects abrem corretamente no mobile e tablet.
- Labels não ficam colados no campo.
- Botões de voltar/avançar ficam alinhados.

### Fluxos

- Solicitar orçamento cria pedido e leva para o estado esperado.
- Profissional consegue aceitar/recusar pedido.
- Chat fica bloqueado antes do aceite e liberado depois.
- Notificação de aceite/mensagem aparece no cliente.
- Login/cadastro não piscam estado deslogado depois do carregamento.

## Como reportar problemas

Para cada problema, envie:

```txt
Página:
Viewport:
O que aconteceu:
O que deveria acontecer:
Print:
```

## Critério de parada

Não abrir nova refatoração ampla sem um print real. A próxima rodada deve ser cirúrgica: uma tela, um breakpoint e uma causa raiz por vez.
