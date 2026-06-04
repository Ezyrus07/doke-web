# Mobile/tablet pass — index.html — 2026-05-20

## Escopo
Normalização responsiva da home em tablet, sem redesign global e sem alterar desktop ou mobile phone aprovado.

## Problema corrigido
Entre 561px e 760px, a home podia alternar entre estado de mobile shell e estado de tablet/desktop. Isso causava inconsistência entre iPad mini, iPad e iPad Pro: header/topbar diferentes, bottom-nav aparecendo em alguns tablets, hero/search com larguras diferentes e cards com comportamento de mobile esticado.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home.css`
- `assets/css/pages/home-tablet.css`
- `docs/mobile-tablet-home-pass-2026-05-20.md`

## Decisões técnicas
- `home-tablet.css` agora é carregado diretamente após os patches tardios da home, para conseguir atuar como dono final do contrato tablet.
- O import antigo de `home-tablet.css` dentro de `home.css` foi removido para evitar duplicação de carga.
- Tablet da home foi estabilizado em `561px–1024px`.
- Mobile phone `<=560px` fica fora do escopo.
- Desktop `>=1025px` fica fora do escopo.

## Contrato aplicado
- Tablet usa topbar compacta da home, não o mobile header empilhado.
- Bottom-nav é ocultada no tablet da home para evitar estado híbrido.
- Hero/search ocupa o trilho real da página.
- CTAs do hero ficam em duas colunas no tablet.
- Categorias e cards usam rails horizontais controlados, sem overflow de documento.
- Cards de destaque usam colunas responsivas por rail: duas colunas no tablet compacto e três no tablet largo quando couber.

## Riscos
- A home ainda tem CSS histórico e muitos overrides com `!important`; por isso a correção foi feita como contrato final de tablet e mantida em um arquivo já existente da página.
- Não houve consolidação ampla de CSS legado nesta etapa.

## QA recomendado
Validar no navegador real:
- 575x767
- 608x926
- 617x876
- 768x1024
- 1024x768
- 390x844 para garantir que o phone não foi afetado
- 1366x768 para garantir desktop intacto

Critérios:
- sem scroll horizontal do documento;
- sem header duplicado;
- sem bottom-nav em tablet da home;
- hero e cards alinhados ao mesmo trilho;
- desktop sem alteração perceptível.
