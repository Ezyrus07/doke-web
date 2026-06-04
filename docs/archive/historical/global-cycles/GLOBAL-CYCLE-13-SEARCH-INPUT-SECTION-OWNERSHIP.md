# Ciclo Global 13 — Search/Input/Section Header Ownership

## Objetivo

Centralizar contratos globais de controles de formulário, busca e cabeçalhos de seção sem redesenhar páginas existentes.

Este ciclo prepara o Doke para alterações futuras e para renderização via dados/scripts, mantendo os padrões de baixa especificidade para não disputar com CSS legado enquanto a migração ainda está em andamento.

## Contratos criados

- `assets/css/components/forms/form-controls.css`
- `assets/css/components/search/search-field.css`
- `assets/css/components/sections/section-header.css`

## Manifest atualizado

- `assets/css/core/components.css`

Os contratos passam a ser carregados globalmente por `core/index.css`, sem exigir novos imports página por página.

## Responsabilidades

### `form-controls.css`

Responsável por base reutilizável de:

- `.doke-input`
- `.doke-select`
- `.doke-textarea`
- `.doke-field`
- `.doke-label`
- hints/erros de formulário

Não deve cuidar de layout específico de páginas como carteira, configurações, auth ou pagamento.

### `search-field.css`

Responsável por base reutilizável de:

- `.doke-searchbox`
- `.doke-search-field`
- inputs internos de busca
- hooks de dados como `[data-search-list]`, `[data-search-empty]`, `[data-search-loading]` e `[data-search-error]`

Não deve controlar topbar, largura de página, filtros ou resultados.

### `section-header.css`

Responsável por base reutilizável de:

- `.doke-section-header`
- `.doke-section-header__copy`
- `.doke-section-header__eyebrow`
- `.doke-section-header__title`
- `.doke-section-header__description`
- `.doke-section-header__actions`

Não deve controlar espaçamento vertical específico de uma página.

## Regra de migração

As páginas ainda podem manter classes legadas, mas novas implementações devem preferir os contratos acima. Quando uma página provisória for redesenhada, ela deve migrar gradualmente para esses hooks, sem transformar visual temporário em contrato global.

## Data-ready

Para listas e buscas futuras, usar hooks previsíveis:

- `[data-search-list]`
- `[data-search-empty]`
- `[data-search-loading]`
- `[data-search-error]`

Isso evita acoplar JS a classes puramente visuais.

## Validação

Comando criado:

```bash
npm run audit:search-input-section-ownership
```

Critérios:

- contratos existem;
- contratos são importados pelo manifest global;
- nenhum contrato usa `!important`;
- tokens principais estão presentes.
