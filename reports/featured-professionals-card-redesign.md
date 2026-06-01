# Featured professionals card redesign

## Causa raiz
A seção `featured-pros` ainda usava a anatomia antiga do `.pro-card--compact`: avatar pequeno, score solto no header e pouco espaço para sinais de confiança. Em tablet/mobile, contratos antigos comprimiam os cards em grid ou miniaturas, reduzindo leitura e confiança.

## Implementação
- Atualizado o markup dos cards em `index.html` para a nova anatomia:
  - avatar circular com selo verificado;
  - botão salvar;
  - nome, profissão e localização;
  - chips de confiança;
  - métricas de avaliação, avaliações e preço inicial;
  - CTA primário `Ver perfil`.
- Estilos base adicionados ao contrato existente `assets/css/components/cards/marketplace-card-contract.css`.
- Tablet continua sob autoridade de `assets/css/pages/home/tablet-safari-layout.css`, como rail horizontal com prévia lateral.
- Mobile continua sob autoridade de `assets/css/pages/home/mobile-index-feed-contract.css`, como rail de 1 card legível + prévia lateral.

## Observações
A regra de tablet/mobile precisou atuar dentro de arquivos já existentes que possuem `!important` legado. Não foi criado arquivo novo e não houve alteração em shell, header, sidebar ou JS.
