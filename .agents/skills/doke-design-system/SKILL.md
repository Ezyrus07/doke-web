---
name: doke-design-system
description: Auditar, planejar, implementar ou revisar mudancas visuais e estruturais no frontend Doke com preservacao do baseline, ownership correto de CSS e validacao responsiva. Usar em tarefas sobre componentes, design system, CSS, HTML visual, layout, responsividade, shell, header, sidebar, cards, botoes, formularios, modais, dropdowns, tabs, badges, estados visuais, bordas, sombras, radius, spacing ou consolidacao de autoridades.
---

# Doke Design System

Proteja o baseline visual aprovado e reduza fragmentacao estrutural. Corrija a autoridade real com mudancas pequenas, reversiveis e comprovadas.

## 1. Carregar as autoridades

Antes de diagnosticar ou editar, leia integralmente:

1. `AGENTS.md`
2. `PROJECT-RULES.md`
3. `ARCHITECTURE.md`
4. os documentos de autoridade exigidos por `AGENTS.md`;
5. os documentos de validacao relevantes ao componente ou pagina em escopo.

Trate a ordem de precedencia declarada nesses documentos como vinculante. Preserve alteracoes preexistentes no worktree e nao atribua a tarefa atual mudancas que ja estavam presentes.

## 2. Definir o modo da tarefa

- Em modo audit ou review, trabalhe somente com leitura, evidencias e planos. Nao altere arquivos.
- Em modo implementacao, edite apenas os arquivos autorizados pelo escopo do usuario.
- Se o usuario pedir diagnostico, nao implemente sem autorizacao explicita.

## 3. Diagnosticar a causa raiz

Nao edite antes de:

1. reproduzir o sintoma;
2. localizar a regra vencedora no DOM e nos computed styles;
3. comparar primeiro paint, estado hidratado e estado interativo quando aplicavel;
4. distinguir divergencia visual real de inconsistencia apenas documental;
5. explicar por que a autoridade atual produz o problema.

Nao trate falha de auditoria, nome de arquivo, import ou diferenca de classe como prova suficiente de erro visual. Nao proponha mudanca apenas para fazer um audit passar.

## 4. Identificar a autoridade canonica

Classifique cada problema em uma autoridade primaria:

- `assets/css/core/`: tokens, reset, tipografia, layout base e utilitarios globais;
- `assets/css/components/`: anatomia visual e estados de componentes compartilhados;
- `assets/css/patterns/`: composicoes reutilizaveis, rails, feeds e agrupamentos;
- `assets/css/pages/`: composicao, grid, fluxo, spacing e excecoes exclusivas de uma pagina;
- `assets/js/`: comportamento, estado e orquestracao, nunca correcao de CSS.

Nao coloque anatomia compartilhada em CSS de pagina. Paginas nao podem redefinir padding interno, border, border-radius, box-shadow, tipografia interna, media, CTA ou estados de componentes reutilizaveis.

## 5. Inventariar consumidores

Antes de mover, remover, consolidar ou mudar a cascata:

1. mapeie links CSS diretos dos HTMLs;
2. resolva a cadeia completa de `@import`;
3. procure carregamento dinamico e referencias em JavaScript;
4. liste classes, variantes, estados e paginas consumidoras;
5. identifique regras concorrentes e a ordem real da cascata;
6. registre consumidores de desktop, tablet, mobile, carregamento direto e navegacao interna.

Considere import, cache-busting e mudanca de ordem da cascata como alteracoes de comportamento. Nao mova CSS nem retire imports antes de mapear todos os consumidores.

## 6. Preservar o baseline

Use `index.html` como baseline visual principal e congelado.

- Nao proponha nem aplique mudanca no `index.html` sem evidencia de bug ou regressao.
- Quando outra pagina precisar do mesmo visual, promova o contrato para `components` ou `patterns`; nao copie CSS da home para uma pagina.
- Antes de consolidar uma regra consumida pela home, registre screenshots e computed styles do estado aprovado.
- Preserve largura, hierarquia, spacing, cards, CTAs, header e comportamento responsivo existentes.

## 7. Planejar antes de implementar

Declare:

1. objetivo de negocio ou UX;
2. causa raiz confirmada;
3. autoridade primaria e autoridades secundarias;
4. inventario de consumidores;
5. arquivos permitidos;
6. arquivos explicitamente proibidos;
7. plano de validacao;
8. rollback ou contencao.

Mantenha cada patch restrito a uma familia de componentes sempre que possivel.

## 8. Implementar com contencao

- Faca a menor mudanca que resolva a causa raiz.
- Mantenha a mudanca reversivel e com diff isolavel.
- Reutilize contratos e tokens existentes antes de criar novos.
- Remova ou consolide a causa do conflito antes de adicionar outra camada.
- Preserve hooks de JS e semantica de dominio quando migrar a autoridade visual.
- Nao crie arquivos de producao com nomes de remediacao proibidos por `AGENTS.md`.
- Nao use `!important`.
- Nao use `style` inline.
- Nao aumente especificidade para encobrir conflito.
- Nao resolva com JavaScript um problema pertencente ao CSS.
- Nao duplique contratos de componente, layout, header, sidebar, rail ou navegacao.
- Nao altere shell, header, sidebar, rail, router ou CSS global para corrigir um problema local.

## 9. Validar antes de afirmar sucesso

Execute, quando aplicavel:

```bash
npm run audit:agent-governance
npm run audit:unused-asset-candidates
npm run audit:duplicate-assets
git diff --check
```

Em Windows/PowerShell, prefira `npm.cmd` quando `npm` nao for confiavel.

Se alterar JavaScript, execute `node --check` em cada arquivo alterado.

Ao tocar componente compartilhado, layout global, shell, header, sidebar, rail, router, responsividade ou varios HTMLs, valide no minimo:

- desktop: `1366x768`;
- tablet: `820x1180`;
- mobile: `390x844`.

Compare carregamento direto e `DokeNavigate(...)`. Verifique overflow horizontal, focus, hover, disabled, loading, empty, ready, error, selected e expanded quando existirem.

Nao afirme que o resultado esta correto sem validacao visual. Se ela nao puder ser executada, declare o resultado como pendente de verificacao visual.

## 10. Entregar o relatorio final

Informe sempre:

- causa raiz;
- autoridade canonica usada;
- consumidores mapeados;
- arquivos alterados;
- arquivos removidos;
- impacto visual esperado;
- validacoes e viewports executados;
- riscos restantes;
- testes nao executados e motivo;
- rollback recomendado;
- proximo passo seguro.

Nao declare sucesso total enquanto houver validacao obrigatoria pendente.
