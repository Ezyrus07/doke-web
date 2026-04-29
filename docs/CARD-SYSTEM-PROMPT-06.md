# Prompt 06 — Sistema de cards

## Objetivo
Padronizar a base visual dos cards do site sem apagar diferenças de conteúdo entre cards de serviço, pedidos, mensagens e perfil.

## Arquivo criado

```txt
assets/css/components/cards/card-system.css
```

## Contratos definidos

```txt
.doke-card
.doke-card--service
.doke-card--order
.doke-card--message
.doke-card--profile
```

A camada também mapeia classes legadas já existentes para evitar alteração estrutural agressiva nesta etapa:

```txt
.service-card
.order-card
.message-item
.profile-card
.pro-card
.recommendation-card
.community-member-card
.notification-card
wallet cards relevantes
```

## Tokens adicionados

```txt
--doke-card-bg
--doke-card-border
--doke-card-shadow
--doke-card-shadow-hover
--doke-card-radius-sm
--doke-card-radius
--doke-card-radius-lg
--doke-card-padding-sm
--doke-card-padding
--doke-card-padding-lg
--doke-card-gap-*
--doke-card-title
--doke-card-text
--doke-card-muted
--doke-card-primary
--doke-card-focus
```

## HTMLs atualizados
Todos os HTMLs principais carregam o novo contrato no final da cadeia de CSS, para que a camada consiga absorver inconsistências antigas sem `!important`.

## Decisão técnica
O componente foi carregado como uma camada de padronização transitória porque ainda existem estilos antigos de cards em `pages/` e `components/cards/` com responsabilidades sobrepostas. A próxima etapa segura é absorver gradualmente esses estilos antigos dentro de `card-system.css` ou dividir o contrato em arquivos definitivos por tipo:

```txt
service-card.css
order-card.css
message-card.css
profile-card.css
```

## Validação estática
- Nenhum `!important` foi adicionado.
- O contrato preserva conteúdo específico por tipo de card.
- O contrato evita containers duplicados.
- O contrato centraliza borda, sombra, radius, spacing, tipografia, botões e responsividade.
