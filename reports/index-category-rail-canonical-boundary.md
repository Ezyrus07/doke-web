# Index category rail canonical boundary — 2026-06-02

## Causa raiz
A seção de categorias da home ainda tinha contratos concorrentes em arquivos antigos de home/tablet. Em desktop com zoom, desktop estreito e tablet landscape, a viewport CSS podia escapar do limite anterior de 1680px e voltar para regras antigas que distribuíam os itens como desktop, criando espaçamento exagerado e comportamento inconsistente.

## Correção
Foi adicionado um bloco final no arquivo de autoridade já existente `assets/css/pages/home/tablet-safari-layout.css`, sem criar arquivo novo, para manter a seção como rail horizontal determinístico entre 700px e 2200px.

O bloco força, dentro da própria autoridade da home/tablet:
- trilho com `flex-flow: row nowrap`;
- `justify-content: flex-start`;
- largura dos cards por `clamp(112px, 8.5vw, 138px)`;
- ícones por `clamp(74px, 5.5vw, 84px)`;
- scroll horizontal com padding de preview;
- sem distribuição por `space-between`/desktop spread.

## Sobre `!important`
O bloco usa `!important` porque os contratos legados que ele substitui nesse mesmo domínio já usam `!important` extensivamente. A correção não adiciona uma nova autoridade; ela consolida a autoridade final dentro do arquivo correto da home/tablet. A próxima etapa ideal é reduzir esses `!important` após validação visual real.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home/tablet-safari-layout.css`

## Validação executada
- Integridade de chaves CSS.
- `node scripts/audit-desktop-shell-contracts.js`.
