# Doke Project Rules

## Princípio central
Nenhuma alteração pode quebrar a harmonia visual, estrutural ou responsiva do sistema. Toda mudança deve reforçar padrão, reduzir acoplamento e deixar a base mais preparada para lógica futura.

## Regras de arquitetura
- `core` só pode conter tokens, base, layout global, responsividade estrutural e utilidades realmente globais.
- `components` só pode conter blocos reutilizáveis entre duas ou mais páginas.
- `pages` só pode conter regras exclusivas da página.
- Uma página nunca deve depender do CSS de outra página para sobreviver.
- Ao mover uma regra, preserve comportamento aprovado antes de remover a origem antiga.

## Regras de HTML
- Estrutura semântica e previsível.
- Nomes de classes e `data-*` devem ser consistentes e úteis para JS futuro.
- Não criar marcação só para corrigir visual temporariamente.
- Estados relevantes devem ser representáveis por classe ou `data-state`.

## Regras de CSS
- Não duplicar bloco já existente sem justificativa técnica clara.
- Não usar remendo local quando o problema pertence a shell, componente ou core.
- Não importar folha de uma página em outra página.
- Responsividade deve ser tratada como sistema, não como exceção pontual.
- Toda mudança deve preservar consistência de largura, espaçamento, cards, topo e hierarquia visual.

## Regras para evolução de lógica
- Preparar containers para estados: loading, empty, ready, error, selected, expanded, owner, visitor.
- Preferir estruturas que permitam renderização dinâmica sem reescrever HTML base.
- Evitar seletores frágeis dependentes de ordem visual.
- Priorizar componentes que possam receber dados reais depois.

## Checklist antes de aceitar uma mudança
- Isso melhora ou preserva a harmonia visual do sistema?
- Isso reduz ou aumenta acoplamento?
- Isso está no arquivo correto?
- Isso facilita lógica futura?
- Isso melhora desktop e mobile ou piora um dos dois?
- Isso evita duplicação?

## Critérios de rejeição
- Gambiarra visual que cria exceção nova.
- CSS duplicado sem owner claro.
- Página dependendo de estilos herdados de outra página.
- Mudança que resolve hoje e piora a manutenção amanhã.
