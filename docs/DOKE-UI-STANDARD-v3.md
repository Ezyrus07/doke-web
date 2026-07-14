# Doke UI Standard v3 — Superfícies sem borda

## Status
Experimento visual aprovado para avaliação no `doke-ui-standard.html`. Ainda não deve ser aplicado globalmente sem validação nas páginas-base.

## Direção proposta
- Cards e painéis externos não usam borda visível.
- A separação acontece por contraste de fundo e sombra suave.
- Apenas uma superfície por hierarquia recebe sombra.
- Agrupamentos internos usam fundo secundário, espaçamento ou divisor discreto.
- Inputs mantêm sinal de interação próprio; esta regra não remove automaticamente suas bordas.

## Níveis
1. **Superfície principal:** sombra ampla e quase imperceptível.
2. **Card de conteúdo:** sombra curta e suave.
3. **Superfície interna:** normalmente sem sombra; usa fundo secundário.

## Proibido
- Card dentro de card com duas sombras.
- Sombra preta ou muito saturada.
- Sombra em cada linha de configuração.
- Remover borda de campo sem manter foco, erro e contraste acessíveis.

## Próxima validação
Comparar este padrão em Carteira, Configurações e Admin antes de alterar os componentes produtivos.


## Comparação antes × depois

O guia inclui uma comparação lado a lado usando exatamente o mesmo conteúdo. O antes demonstra bordas em múltiplos níveis; o depois demonstra uma única superfície elevada, fundos suaves nos controles e agrupamento por espaçamento.
