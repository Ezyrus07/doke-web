# Mapa de arquivos ativos

## HTMLs ativos
- `index.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `pagamento.html`
- `adicionar-cartao.html`
- `conta-bancaria.html`
- `perfil.html`
- `perfil-cliente.html`
- `perfil-profissional.html`
- `comunidade.html`
- `avaliacao.html`
- `finalizar-pedido.html`
- `mais.html`
- `ui-kit.html`
- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

## Base compartilhada prioritária
- `assets/css/core/*`
- `assets/css/components/cards/service-card.css`
- `assets/css/components/profile/profile-layout.css`
- `assets/js/core/app.js`
- `assets/js/features/profile/*`
- `assets/data/mocks/profile-data.js`

## Fora da base ativa
- `archive/*`
- `assets/js/supabase-config.example.js`

## Regra de manutenção
- resolver shell, sidebar, cards e perfis primeiro na base compartilhada
- evitar criar nova versão local de componente já existente
- antes de editar um card de serviço, validar se a mudança pertence ao owner `assets/css/components/cards/service-card.css`
