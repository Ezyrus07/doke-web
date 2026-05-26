# Mobile card distribution fix

Correção objetiva para impedir cards espremidos no mobile.

| Problema | Medida | Antes | Depois | Breakpoint | Arquivo |
|---|---:|---:|---:|---|---|
| Destaques renderizando 3 cards espremidos no mobile | largura do card | 108px | 319.8px | 390x844 | `assets/css/components/cards/mobile-card-distribution-contract.css` |
| Grid de Destaques usando colunas desktop/tablet no mobile | grid-template-columns | 108px 108px 108px | rail horizontal com grid-auto-columns 319.8px | 390x844 | `assets/css/components/cards/mobile-card-distribution-contract.css` |
| Conteúdo interno do card vazando/cortando CTA e texto | scrollWidth - clientWidth do card | até 23px | 0px | 390x844 | `assets/css/components/cards/mobile-card-distribution-contract.css` |
| Mais anúncios com cards excessivamente altos após empilhamento | altura do card | 531.4px | 235.4px | 390x844 | `assets/css/components/cards/mobile-card-distribution-contract.css` |
| Body/page não deve ganhar scroll horizontal | documentElement.scrollWidth - clientWidth | 0px | 0px | 390x844 | `assets/css/components/cards/mobile-card-distribution-contract.css` |

Validação: body sem overflow horizontal; Destaques virou rail horizontal legível; Mais anúncios ficou em uma coluna com cards íntegros; CTA não apresenta overflow interno.
