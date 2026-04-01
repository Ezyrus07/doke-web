# Doke - Estrutura Organizada

Este pacote foi reorganizado para separar claramente base compartilhada, arquivos específicos de página e documentação.

## Estrutura

- `index.html` - home principal
- `resultados.html` - listagem/resultados
- `detalhe-anuncio.html` - detalhe do anúncio
- `pedidos.html` - central do cliente para acompanhar solicitações enviadas
- `mensagens.html` - central de conversas
- `notificacoes.html` - central de alertas
- `carteira.html` - visão financeira do cliente
- `pagamento.html` - gestão de pagamento
- `adicionar-cartao.html` - cadastro de cartão
- `conta-bancaria.html` - gestão de conta bancária
- `perfil.html` - perfil do usuário
- `comunidade.html` - área de comunidade
- `avaliacao.html` - avaliação pós-serviço
- `finalizar-pedido.html` - fechamento pós-serviço
- `auth/` - login, cadastro e recuperação
- `templates/` - base para novas páginas
- `docs/` - documentação de estrutura e manutenção
- `assets/`
  - `css/core/` - tokens, base global, layout estrutural e componentes reutilizáveis
  - `css/pages/` - estilos específicos por página ou contexto
  - `js/core/` - shell global, auth service e configuração base
  - `js/pages/` - comportamentos exclusivos por página
  - `img/` - imagens do projeto

## Regras de manutenção

1. Regras globais entram em `assets/css/core/`.
2. CSS específico entra em `assets/css/pages/`.
3. Scripts globais entram em `assets/js/core/`.
4. Scripts específicos entram em `assets/js/pages/`.
5. Evite criar arquivo novo antes de verificar se já existe um módulo responsável.
6. Remover arquivos órfãos ou sem referência antes de padronizar.

## Documentação adicional

- `docs/FILES-ORGANIZATION.md` - resume a limpeza aplicada e o que permanece como base ativa.
