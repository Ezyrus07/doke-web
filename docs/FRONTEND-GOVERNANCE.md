# Governança frontend

Este documento define como mudanças devem ser planejadas, aplicadas e validadas no Doke.

## Antes de alterar

1. Identificar a causa raiz.
2. Mapear os arquivos realmente envolvidos.
3. Confirmar a autoridade correta: core, component, pattern ou page.
4. Preservar baseline visual aprovado.
5. Planejar rollback simples.

## Durante a alteração

- Fazer mudanças pequenas.
- Evitar tocar em muitas páginas no mesmo patch.
- Não criar remendos temporários.
- Não adicionar `!important` sem justificativa extrema.
- Não aumentar especificidade para esconder conflito.
- Não duplicar CSS/JS existente.

## Depois da alteração

Sempre registrar:

- causa raiz;
- arquivos alterados;
- páginas/viewports testados;
- riscos restantes;
- testes não executados.

## Auditorias recomendadas

```bash
npm run audit:docs-report-hygiene
npm run audit:duplicate-assets
npm run audit:unused-asset-candidates
npm run audit:important-reduction-plan
npm run audit:frontend
```

## Política de deleção

Arquivos com nomes ruins não devem ser apagados apenas pelo nome. Antes de remover, verificar:

- import direto em HTML;
- import via CSS;
- carregamento dinâmico por JS;
- referência em scripts;
- risco de runtime visual.
