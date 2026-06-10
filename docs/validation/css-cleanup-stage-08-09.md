# CSS Cleanup Stage 08-09

## Objetivo

Continuar a redução de CSS de remendo na cascata ativa da home, sem tentar corrigir visual por cima.

## Stage 08 — Header layout

A home deixou de importar diretamente:

```txt
assets/css/components/shell/app-header.css
```

Esse arquivo continua existindo porque ainda é usado por outras páginas, mas não deve ser autoridade tardia da home.

Novo arquivo criado:

```txt
assets/css/layout/header.css
```

Responsabilidade do novo arquivo:

- largura básica do header;
- alinhamento dos grupos;
- tamanho mínimo dos controles;
- regra mobile simples para esconder localização.

Ele não deve conter regra de cards, rails, carrosséis ou ajustes específicos de página.

## Stage 09 — Preview workers/publicações

O arquivo abaixo virou manifesto puro:

```txt
assets/css/components/before-after-workers-preview.css
```

Foi removido o bloco final de override que concentrava centenas de declarações de prioridade para centralizar/forçar o modal de workers. A anatomia do modal deve ficar nos módulos importados:

- before-after-shell.css
- before-after-media.css
- before-after-sidebar.css
- before-after-responsive.css
- workers-modal.css
- publication-light-modal.css
- demais módulos do preview

## Métrica depois do Stage 08-09

```txt
CSS ativo transitivo do index/home: 123 arquivos
Declarações !important ativas no index/home: 3.818
Declarações !important totais em assets/css: 20.647
```

Comparado ao Stage 04-07 informado anteriormente:

```txt
!important ativo index/home: 3.378 -> 3.818
```

Observação: a contagem ativa calculada neste relatório usa análise recursiva completa dos imports do zip Stage 04-07 já aplicado. Ela inclui imports transitivos que podem não ter sido contados na mesma base do relatório anterior. O ganho real desta etapa é a remoção da home de `app-header.css` e a remoção do bloco final de `before-after-workers-preview.css`.

## Risco

Alto risco visual em:

- header da home;
- botões do header;
- modal/preview de workers;
- modal de publicação.

Risco aceito nesta fase porque o objetivo é reduzir autoridade tardia e arquivos de remendo.

## Critério mínimo de aceite

- index abre;
- conteúdo principal aparece;
- header ainda existe, mesmo que menos refinado;
- modal pode perder acabamento, mas não deve impedir a home de abrir;
- scroll não trava.
