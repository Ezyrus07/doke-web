# Guia de design system Doke

Este guia preserva consistência visual enquanto o frontend evolui para lógica real.

## Princípios

- Superfícies limpas, bordas consistentes e sombra controlada.
- Cards reutilizáveis com anatomia previsível.
- Botões com hierarquia clara: primário, secundário, ghost e ações compactas.
- Espaçamentos consistentes entre header, seções, cards e rails.
- Mobile não deve parecer outro produto; deve ser adaptação do mesmo sistema.

## Cores e botões

Botões que antes usavam gradiente azul-verde devem seguir o mesmo azul/estilo do botão `Entrar` de `auth/login.html`, salvo exceção explícita.

## Cards

Cards devem separar:

- mídia;
- título;
- descrição/resumo;
- metadados;
- ações;
- estados futuros.

Cards de anúncio, worker, publicação, pedido, avaliação e profissional devem reaproveitar contratos existentes antes de criar variações.

## Estados visuais

Estados recomendados:

```txt
loading
empty
ready
error
selected
expanded
disabled
owner
visitor
```

Use classes ou `data-state` previsíveis quando preparar renderização futura.

## Regra contra fragmentação

Não criar arquivo novo de estilo apenas para pequenos ajustes visuais. Primeiro procurar autoridade em:

1. `core`
2. `components`
3. `patterns`
4. `pages`

Se um arquivo novo for inevitável, seu nome deve descrever responsabilidade estável, não bug ou etapa.
