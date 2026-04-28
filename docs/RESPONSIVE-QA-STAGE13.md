# Etapa 13 — Validação Responsiva por Breakpoints

Esta etapa não altera CSS, HTML ou JS de produção. Ela adiciona ferramentas e uma matriz de QA para validar visualmente o responsivo antes de qualquer limpeza ou correção fina.

## Por que esta etapa existe

Depois do problema causado pelo Stage 10, a regra mudou: nenhum contrato global deve alterar desktop ou componentes estáveis sem evidência. A Etapa 13 cria essa evidência.

## Arquivos adicionados

```txt
tools/responsive-stage13-dashboard.html
tools/serve-stage13.mjs
tools/validate-responsive-stage13.mjs
docs/RESPONSIVE-QA-STAGE13.md
docs/validation/responsive-stage13-checklist.md
docs/validation/responsive-stage13-matrix.json
```

## Como validar localmente

Na raiz do projeto:

```bash
node tools/serve-stage13.mjs
```

Depois abra:

```txt
http://127.0.0.1:5173/tools/responsive-stage13-dashboard.html
```

O dashboard permite alternar página e breakpoint, renderizar a página em iframe e medir:

- overflow horizontal;
- elementos maiores que a viewport;
- botões/links/inputs com alvo pequeno;
- presença/altura do bottom nav.

## Breakpoints oficiais desta etapa

```txt
320px  — iPhone SE / caso crítico
342px  — mobile estreito
360px  — Android comum
375px  — iPhone padrão
390px  — iPhone moderno
414px  — mobile grande
768px  — tablet
1024px — desktop pequeno
1366px — desktop padrão
```

## Critérios de aprovação

Uma página só deve avançar para ajuste fino quando:

1. não tiver overflow horizontal em 320–414px;
2. o último bloco não ficar escondido pelo bottom nav;
3. topbar/mobile header não sobrepor conteúdo;
4. botões de ação principais forem clicáveis com conforto;
5. cards não invadirem a viewport;
6. desktop 1024/1366 permanecer visualmente igual ao padrão existente.

## Próxima etapa segura

A Etapa 14 deve corrigir apenas os problemas encontrados nesta matriz. Não aplicar regra global em `button`, `.btn`, `.card`, `.icon`, `.chip`, `input` ou `a` fora de media query mobile sem validação explícita.
