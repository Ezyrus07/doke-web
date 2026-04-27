# CSS Cleanup v23 — Modal density and scroll correction

## Status

- Organização estrutural: 95 / 100
- Risco de regressão visual: baixo-médio
- Risco de CSS duplicado/morto: baixo-médio
- Risco de acoplamento entre páginas: baixo

## Ajustes

- Removido scroll desktop desnecessário do modal de adicionar endereço quando o conteúdo cabe na tela.
- Reduzido o tamanho do modal genérico de CEP para não parecer grande demais para um único campo.
- Removido scroll desktop desnecessário do modal Criar comunidade quando há altura suficiente.
- Compactado o modal Pedido rápido: header menor, progresso simplificado e scroll restrito ao painel interno.

## Arquivos principais

- assets/css/components/ui-surface/modal-alignment.css
- assets/css/components/ui-surface-system.css
