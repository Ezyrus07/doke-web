# Prompt operacional — consistência visual do Doke

Copie o conteúdo abaixo para a IA responsável pela reforma. Este prompt autoriza
alterações no frontend, mas exige execução incremental, validação visual e
proteção do baseline aprovado.

---

Você está trabalhando no projeto Doke Web. Sua missão é auditar todos os HTMLs
ativos, consolidar padrões visuais reutilizáveis e criar regras automatizadas
que impeçam novas divergências.

Não faça apenas um relatório. Diagnostique, implemente em lotes pequenos,
valide cada lote e continue enquanto houver correções seguras e comprováveis.
Não tente reescrever o site inteiro de uma vez.

## Objetivo

Eliminar inconsistências sistêmicas, principalmente:

- distância entre cabeçalho de conteúdo e primeiro card/seção;
- rail, largura e alinhamento entre título, conteúdo e header;
- anatomia divergente para ações semanticamente iguais;
- botões com alturas, bordas, raios, sombras e pesos diferentes;
- links que deveriam consumir um botão compartilhado;
- cards equivalentes com bordas, raios, padding ou sombras diferentes;
- inputs, radios, checkboxes, switches, tabs, chips e badges fora do contrato;
- estruturas HTML diferentes para o mesmo componente ou ação;
- CSS de página redesenhando componentes compartilhados;
- regras locais que anulam componentes globais por especificidade ou ordem;
- diferenças entre carregamento direto, navegação interna e breakpoints.

Exemplos obrigatórios de equivalência:

- `Ver pedido`;
- `Abrir conversa`;
- `Confirmar pagamento`;
- `Cancelar`;
- `Salvar alterações`;
- títulos e descrições de páginas internas;
- header contextual versus header padrão;
- cards de resumo, status e ações;
- controles de formulário e seleção.

## Constituição obrigatória

Antes de alterar qualquer arquivo:

1. Leia `AGENTS.md`.
2. Leia `docs/DOKE_AGENT_CONSTITUTION.md`.
3. Leia `docs/ARCHITECTURE.md`.
4. Leia `docs/CSS_AUTHORITY_MAP.md`.
5. Leia `docs/DESIGN-SYSTEM-GUIDE.md`.
6. Leia `docs/VALIDATION.md`.
7. Leia `docs/PAGE-ASSET-AUTHORITY-MATRIX.md`.
8. Inspecione:
   - `reports/generated/active-legacy-structures-report.json`;
   - `reports/generated/page-asset-authority-matrix.json`.
9. Rode `npm run audit:agent-governance`.
10. Verifique `git status` e preserve todas as alterações preexistentes.

Se algum documento citado não existir, registre isso e use a autoridade viva
mais próxima. Não invente arquivos de fase para compensar documentação ausente.

## Regras invioláveis

- Corrija causa raiz, não sintomas isolados.
- Preserve o baseline aprovado da home e dos componentes já estabilizados.
- Não adicione `!important` como solução.
- Não aumente especificidade para vencer um conflito sem remover a causa.
- Não duplique anatomia de botão, card, input, modal, header, rail ou navegação.
- Não resolva em JavaScript um problema de CSS.
- Não altere shell/header global para corrigir uma única página.
- Não crie arquivos com nomes de remendo.
- Não remova CSS ou JS sem provar carregamento, responsabilidade e substituição.
- Não substitua o `body` inteiro no roteador.
- Não considere classes iguais como prova de consistência: compare estilos
  computados no navegador.
- Não padronize componentes com funções diferentes apenas porque são parecidos.
- Não faça “polish” solto. Toda mudança deve ter autoridade definida.

## Autoridades

Respeite estas fronteiras:

- `assets/css/core/`: tokens, reset, tipografia e layout base;
- `assets/css/components/`: anatomia de componentes;
- `assets/css/patterns/`: composições reutilizáveis;
- `assets/css/pages/`: organização e exceções locais escopadas;
- `assets/css/layout/header.css`: header compartilhado;
- `assets/css/layout/page-rail-authority.css`: rail compartilhado;
- `assets/js/core/`: shell, roteador e runtime;
- `assets/js/controllers/`: orquestração;
- `assets/js/renderers/`: HTML gerado a partir de dados;
- `assets/js/pages/`: comportamento específico.

CSS de página pode controlar grid, gap, ordem, posicionamento, largura contextual
e margens locais. CSS de página não deve controlar a anatomia interna de um
componente compartilhado.

## Fase 1 — inventário completo

Mapeie todos os HTMLs ativos na raiz do projeto. Exclua backups, relatórios
gerados, arquivos em `tools/local-backups` e cópias históricas.

Para cada página, registre:

- stylesheet de entrada e cadeia de imports;
- scripts e renderers capazes de produzir componentes;
- `body[data-page]`;
- variante do header;
- rail e container principal;
- bloco de título/descrição;
- primeiro conteúdo após o título;
- famílias de botões e links de ação;
- cards, forms, modais, tabs, chips, badges e controles;
- regras page-owned que alteram anatomia compartilhada;
- valores computados relevantes.

Produza uma matriz por família, não apenas por arquivo.

## Fase 2 — auditoria visual no navegador

Abra e inspecione as páginas reais. Não confie apenas em leitura estática.

Viewports obrigatórios:

- desktop: `1366x768`;
- tablet: `820x1180`;
- mobile: `390x844`.

Páginas mínimas:

- `index.html`;
- `perfil.html`;
- `pedidos.html`;
- `mensagens.html`;
- `notificacoes.html`;
- `comunidade.html`;
- `resultados.html`;
- `detalhe-anuncio.html`;
- `ajuda.html`;
- `carteira.html`;
- `configuracoes.html`;
- `anunciar-servico.html`;
- `tornar-profissional.html`;
- `orcamento.html`;
- `pagamento-profissional.html`.

Para cada família equivalente, compare pelo menos:

- altura;
- padding;
- border width e cor;
- border radius;
- background;
- sombra;
- fonte, peso e line-height;
- gap interno;
- estados hover, focus, selected, disabled e loading;
- comportamento responsivo;
- acessibilidade e área clicável.

Meça também:

- topo do rail até o título;
- título até a descrição;
- descrição até o primeiro card;
- distância entre seções;
- alinhamento horizontal de header, título e conteúdo.

Use screenshots e estilos computados. Registre qual página é a referência
aprovada para cada família.

## Fase 3 — decisões de contrato

Para cada divergência:

1. identifique a causa raiz;
2. escolha uma única autoridade;
3. defina consumidores;
4. defina exceções justificadas;
5. decida quais regras locais serão removidas;
6. defina a validação antes de implementar.

Não crie um componente novo se um contrato existente puder ser corrigido ou
estendido. Quando dois contratos compartilhados competirem, consolide-os em vez
de adicionar um terceiro.

## Fase 4 — implementação em lotes

Execute nesta ordem:

### Lote A — ritmo de página

- rail;
- cabeçalho de conteúdo;
- título e descrição;
- distância até o primeiro card;
- gaps entre seções.

Crie ou consolide tokens de ritmo compartilhado. Páginas não devem repetir
valores arbitrários para o mesmo padrão.

### Lote B — ações e botões

- mapeie ações semanticamente iguais;
- adote marcação e classes canônicas;
- consolide primary, secondary, ghost, danger, success, icon e link-button;
- padronize estados e área clicável;
- remova borda, raio, altura, sombra e tipografia de botões do CSS de página;
- verifique HTML estático e HTML gerado por renderers.

`Ver pedido` e `Abrir conversa` devem usar o mesmo contrato em todos os HTMLs,
salvo diferença funcional documentada.

### Lote C — superfícies

- cards;
- resumos;
- painéis;
- divisores;
- bordas;
- raios;
- sombras;
- padding.

Não force o mesmo card para domínios diferentes. Consolide apenas anatomias
realmente equivalentes.

### Lote D — formulários e escolhas

- inputs;
- selects;
- textareas;
- checkbox;
- radio;
- switch;
- upload;
- mensagens de erro;
- hints e labels.

### Lote E — navegação e feedback

- headers;
- tabs;
- chips;
- badges;
- modais;
- drawers;
- empty, error, loading e success states.

Após cada lote:

1. rode validações estáticas;
2. valide as páginas consumidoras no navegador;
3. compare carregamento direto e navegação interna quando aplicável;
4. revise o diff;
5. só então avance.

## Fase 5 — regras para impedir regressão

Crie ou amplie auditorias automatizadas que falhem quando houver:

- ação canônica sem classes compartilhadas;
- botão page-owned redefinindo altura, raio, borda, sombra ou tipografia;
- valores arbitrários de raio/borda em componentes que possuem tokens;
- bloco de título fora do contrato de ritmo;
- diferença excessiva entre descrição e primeiro conteúdo;
- variante de header incompatível com seu conteúdo;
- componente compartilhado ausente do stylesheet de entrada;
- classes canônicas anuladas por regra mais específica;
- renderer produzindo HTML diferente do contrato estático;
- novo `!important`;
- novo arquivo com nome de remendo;
- overflow horizontal;
- alvo clicável menor que o contrato definido.

As auditorias devem verificar CSS alcançável e, quando necessário, estilos
computados no navegador. Não crie testes que apenas procurem uma string de
classe sem validar o resultado real.

Registre os novos comandos em `package.json` com nomes estáveis e inclua-os no
pipeline de governança apropriado.

## Documentação viva

Atualize apenas documentos vivos:

- `docs/ARCHITECTURE.md`;
- `docs/CSS_AUTHORITY_MAP.md`;
- `docs/DESIGN-SYSTEM-GUIDE.md`;
- `docs/VALIDATION.md`;
- `docs/BASELINE-VISUAL-APPROVED.md`, se existir.

Documente:

- tokens canônicos;
- anatomia de cada família;
- modificadores permitidos;
- responsabilidades de página versus componente;
- exceções aprovadas;
- exemplos de HTML correto e incorreto.

Não crie documentos permanentes de fase ou “handoff final”.

## Validação mínima

Sempre rode:

```bash
npm run audit:agent-governance
npm run audit:unused-asset-candidates
npm run audit:duplicate-assets
git diff --check
```

Para JS alterado:

```bash
node --check caminho/do/arquivo.js
```

Rode também os audits específicos das famílias alteradas e a validação visual
nos três viewports. Confirme:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Quando shell ou roteador estiverem envolvidos, confirme carregamento direto,
`DokeNavigate(...)`, `body[data-page]`, ausência de reload e scroll vertical.

## Critério de conclusão

Não declare “tudo padronizado” apenas porque algumas páginas foram corrigidas.
A tarefa termina somente quando:

- todas as páginas ativas estiverem na matriz;
- todas as famílias relevantes tiverem autoridade definida;
- divergências seguras tiverem sido corrigidas;
- exceções restantes estiverem justificadas;
- auditorias impedirem a reintrodução dos problemas;
- desktop, tablet e mobile tiverem sido validados;
- nenhum conflito conhecido tiver sido escondido por override.

Se o trabalho não couber em uma única execução, finalize o lote atual em estado
válido e entregue uma fila priorizada, com causa raiz e próximo lote exato. Não
deixe alterações parcialmente migradas.

## Formato obrigatório de entrega

Informe:

- causa raiz por família;
- autoridades escolhidas;
- páginas auditadas;
- páginas alteradas;
- arquivos alterados;
- arquivos removidos;
- conflitos eliminados;
- componentes consolidados;
- regras automatizadas criadas;
- viewports testados;
- comandos executados;
- riscos restantes;
- testes não executados;
- rollback recomendado por lote.

---
