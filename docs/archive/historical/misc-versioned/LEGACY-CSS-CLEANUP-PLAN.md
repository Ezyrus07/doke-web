# Doke — Legacy CSS Cleanup Plan

Este plano define como limpar CSS legado sem quebrar o site.

## 1. Objetivo

Reduzir gradualmente arquivos antigos, duplicados ou temporários sem apagar comportamento ainda usado.

A limpeza deve priorizar segurança, rollback fácil e validação visual.

## 2. O que é CSS legado

Considere legado qualquer arquivo com sinais de correção temporária ou contrato antigo:

```txt
fix
stage
rescue
final
polish
cleanup
legacy
v2
v3
v4
v34
old
backup
```

Exemplos de candidatos observados no projeto:

```txt
mobile-rescue.css
compact-final-adjustments.css
internal-modal-legacy.css
worker-preview-layout-v34.css
final-normalization.css
final-parity.css
mobile-polish.css
```

## 3. O que não fazer

Não apagar arquivos em massa.

Não remover `!important` em lote sem entender a cascata.

Não mover regra para `core/` apenas porque ela é usada em mais de uma página.

Não criar arquivo novo com nome temporário para corrigir legado.

Não mexer em JS/data attributes junto com limpeza CSS, salvo se a tarefa for justamente comportamento.

## 4. Ordem segura de limpeza

### Fase 1 — Inventário

Para cada arquivo suspeito, registrar:

```txt
arquivo
HTMLs que importam
imports indiretos
classes principais
componente afetado
se existe substituto novo
risco de remoção
```

### Fase 2 — Substituição por contrato novo

Antes de remover, garantir que o comportamento visual já é coberto por:

```txt
header-desktop.css
header-mobile.css
bottom-nav.css
action-button.css
mobile-panel.css
card-system.css
app-shell.css
responsive-audit.css
```

### Fase 3 — Remover import, não arquivo

Primeiro remova o import do HTML ou CSS agregador.

Depois teste:

```txt
390px
768px
1366px
```

Só depois considere mover ou apagar o arquivo físico.

### Fase 4 — Quarentena

Se o arquivo não for mais importado, mover para uma pasta de quarentena em branch separada ou manter documentado como candidato a remoção.

Sugestão:

```txt
assets/css/legacy/
```

Atenção: mover arquivo físico muda caminhos e pode quebrar imports indiretos. Faça isso apenas depois de confirmar que não há dependência.

### Fase 5 — Remoção final

Remover apenas quando:

- nenhum HTML importa;
- nenhum CSS importa;
- nenhum JS depende de classe exclusiva;
- o visual foi testado;
- existe rollback pelo Git.

## 5. Como reduzir `!important`

Ordem correta:

```txt
1. Identificar quem está sobrescrevendo quem.
2. Corrigir ordem de importação.
3. Mover regra para o componente correto.
4. Reduzir seletor amplo.
5. Remover !important.
```

Não começar pelo passo 5.

## 6. Critérios de risco

### Baixo risco

- arquivo não importado;
- só comentários;
- duplicação exata de contrato novo;
- não contém seletor usado em HTML.

### Médio risco

- importado por uma página pouco crítica;
- contém ajustes visuais pequenos;
- tem substituto parcial.

### Alto risco

- afeta header;
- afeta bottom nav;
- afeta modais;
- afeta cards globais;
- contém `position: fixed`, `z-index`, `overflow`, `display`, `grid`, `flex`;
- contém muitos `!important`;
- é carregado depois de contratos novos.

## 7. Componentes que exigem mais cuidado

```txt
modais
painéis mobile
worker preview
antes/depois
bottom nav
header mobile
filtros
agenda
seleção
cards de resultado
cards de pedido
```

## 8. Plano de execução recomendado

```txt
1. Limpar arquivos não importados.
2. Limpar duplicações de bottom nav antigo.
3. Limpar duplicações de header antigo.
4. Limpar duplicações de cards antigos.
5. Limpar duplicações de painéis mobile.
6. Consolidar overlays/modais.
7. Reduzir !important restante.
8. Remover arquivos de quarentena.
```

## 9. Regra final

CSS legado só deve morrer depois que o contrato novo provar que substitui sua função.
