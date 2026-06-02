# Arquitetura frontend Doke

Este é o mapa vivo da arquitetura. Documentos de fase podem existir temporariamente, mas este arquivo deve concentrar as decisões permanentes.

## Camadas

```txt
core        -> tokens, reset, tipografia, layout base, utilitários
components  -> botões, cards, inputs, modais, avatars, shell, header
patterns    -> rails, feeds, listas e composições reutilizáveis
pages       -> layout específico de cada HTML
js/core     -> roteador, estado inicial, sessão, clients baixos
js/services -> fronteira de dados e repositórios
js/controllers -> orquestração de páginas
js/renderers -> renderização DOM a partir de dados prontos
js/pages    -> comportamento específico de página
js/state    -> containers/contratos de estado
```

## Regra de autoridade

- CSS global não deve resolver problema específico de página sem escopo explícito.
- Página controla layout contextual, não anatomia interna de componente.
- Componente controla aparência interna e estados próprios.
- Pattern controla composição reutilizável.
- Shell/header/rail/scroll são autoridades globais sensíveis e exigem validação visual.

## Fluxo data-ready futuro

```txt
backend/API/Supabase/Firebase
  -> service/repository
  -> controller
  -> renderer/component
  -> DOM
```

Lógica nova deve preservar HTML fallback e não pode duplicar estrutura visual já existente.
