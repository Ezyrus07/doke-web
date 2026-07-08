# Mobile shell risk boundary

Gerado em: 2026-07-08T15:17:33.759Z

## Resumo

- Arquivo: `assets/css/components/shell/mobile-app-shell.css`
- !important atual: 321
- Limite registrado: 321
- Declarações críticas/token shell: 225
- Declarações guardadas/visuais: 96
- Declarações não classificadas: 0

## Classificação por risco

| risk | count |
| --- | --- |
| critical-structure | 219 |
| guarded-spacing | 50 |
| guarded-interaction-visual | 46 |
| critical-shell-token | 6 |

## Propriedades mais frequentes

| property | count |
| --- | --- |
| display | 32 |
| width | 28 |
| height | 24 |
| min-width | 19 |
| padding | 15 |
| margin | 12 |
| border-radius | 10 |
| max-width | 10 |
| min-height | 10 |
| overflow | 10 |
| align-items | 9 |
| gap | 9 |
| background | 8 |
| justify-content | 7 |
| position | 7 |
| box-shadow | 6 |
| grid-template-columns | 6 |
| place-items | 6 |
| pointer-events | 6 |
| z-index | 6 |
| color | 5 |
| outline | 5 |
| padding-top | 5 |
| -webkit-text-fill-color | 4 |
| justify-self | 4 |
| opacity | 4 |
| transform | 4 |
| visibility | 4 |
| white-space | 4 |
| filter | 3 |
| max-height | 3 |
| padding-bottom | 3 |
| text-overflow | 3 |
| border-color | 2 |
| flex | 2 |
| margin-top | 2 |
| top | 2 |
| --doke-mobile-shell-action-icon | 1 |
| --doke-mobile-shell-action-radius | 1 |
| --doke-mobile-shell-action-size | 1 |

## Exemplos críticos preservados

| line | risk | property | selector |
| --- | --- | --- | --- |
| 149 | critical-structure | position | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 150 | critical-structure | top | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 151 | critical-structure | left | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 152 | critical-structure | z-index | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 153 | critical-structure | display | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 154 | critical-structure | width | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 155 | critical-structure | max-width | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 158 | critical-structure | transform | `body.doke-mobile-shell-mounted:not(.chat-room-mobile-open) .doke-mobile-shell` |
| 173 | critical-structure | display | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 174 | critical-structure | grid-template-columns | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 175 | critical-structure | align-items | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 177 | critical-structure | width | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 178 | critical-structure | height | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 179 | critical-structure | min-height | `body.doke-mobile-shell-mounted .doke-mobile-shell__topbar` |
| 187 | critical-structure | display | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |
| 188 | critical-structure | align-items | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |
| 189 | critical-structure | justify-content | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |
| 191 | critical-structure | height | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |
| 192 | critical-structure | width | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |
| 193 | critical-structure | max-width | `body.doke-mobile-shell-mounted .doke-mobile-shell__profile` |

## Regra de execução

- Não remover `position`, `inset`, `z-index`, `transform`, `display`, `grid`, `flex`, `width/height/min/max`, `overflow`, `visibility`, `pointer-events` ou `opacity` deste arquivo sem validação visual em navegador.
- Não tratar guards de busca expandida, bottom nav, topbar, notificações ou tablet como limpeza simples.
- Remoções futuras neste arquivo devem declarar explicitamente qual família de risco foi alterada e qual viewport foi validada.

## Não classificados

_Nenhum item._

## Violações

Nenhuma violação encontrada.
