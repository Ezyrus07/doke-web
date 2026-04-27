# CSS cleanup report — v5

## Status do site

- Organização estrutural: **61 / 100**
- Risco de regressão visual: **médio-baixo**
- Risco de CSS duplicado/morto: **médio-alto**
- Risco de acoplamento entre páginas: **médio**

## Objetivo desta etapa

Consolidar o padrão mobile de header/hero interno que estava duplicado em `mensagens.css` e `notificacoes.css`, sem alterar visualmente a interface.

## Alterações realizadas

### 1. Contrato compartilhado ampliado

Arquivo atualizado:

```txt
assets/css/pages/internal-list-pages.css
```

Foi adicionado um bloco compartilhado para o header mobile interno usado por mensagens e notificações:

```txt
Shared internal mobile hero/header contract
```

Esse contrato centraliza:

- grid do hero mobile;
- avatar;
- nome/título com ellipsis;
- grupo de chips/ações;
- botão de busca;
- estado ativo dos chips;
- SVGs dos botões.

### 2. CSS específico reduzido

Arquivos reduzidos:

```txt
assets/css/pages/mensagens.css
assets/css/pages/notificacoes.css
```

Removidos blocos duplicados de header mobile que agora pertencem ao contrato compartilhado.

### 3. Cache-busting atualizado

Arquivos HTML atualizados para carregar a versão nova do contrato:

```txt
comunidade.html
comunidade-interna.html
mensagens.html
notificacoes.html
pedidos.html
```

## Redução aproximada

```txt
mensagens.css:      ~76.9 KB -> ~74.0 KB
notificacoes.css:   ~36.9 KB -> ~33.4 KB
internal-list-pages.css: ~16.0 KB -> ~20.9 KB
```

A redução líquida não é enorme porque parte do CSS foi movida para o contrato compartilhado, mas a responsabilidade ficou mais correta.

## Análise crítica

O site está evoluindo para uma estrutura mais profissional, mas ainda carrega sinais claros de crescimento por correção visual sucessiva.

O maior problema restante não é visual; é semântico/arquitetural: classes com prefixo `orders-*` ainda são usadas por páginas que não são de pedidos. Isso funciona, mas dificulta manutenção e leitura do código.

## Próximo alvo recomendado

Criar uma camada de nomes neutros para padrões internos:

```txt
orders-page-header      -> internal-page-header
orders-header-search    -> internal-header-search
orders-select-panel     -> internal-select-panel
orders-select-option    -> internal-select-option
```

Essa migração deve ser feita com aliases temporários, não por troca brusca, para evitar quebrar JS.


## Etapa v6 — aliases semânticos para páginas internas

### Objetivo
Reduzir o acoplamento semântico de páginas como comunidade, mensagens e notificações com classes `orders-*`, mantendo compatibilidade visual e com JavaScript existente.

### Alterações
- Adicionados aliases `internal-*` nos HTMLs não específicos de pedidos.
- Mantidas classes `orders-*` como ponte temporária, para evitar regressão visual ou quebra de scripts.
- Criado `assets/css/components/internal/list-page-aliases.css`.
- `internal-list-pages.css` passou a importar o arquivo de aliases.

### Regra de manutenção
Novos componentes compartilhados de páginas internas devem usar nomes `internal-*`.
Classes `orders-*` devem permanecer apenas em `pedidos.html` e em módulos realmente específicos de pedidos.

### Arquivos alterados nesta etapa
- comunidade.html
- comunidade-interna.html
- mensagens.html
- notificacoes.html
- assets/css/pages/internal-list-pages.css
- assets/css/components/internal/list-page-aliases.css
