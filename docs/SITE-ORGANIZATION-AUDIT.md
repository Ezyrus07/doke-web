# Auditoria rápida de organização do site

## Problemas estruturais observados
- A camada de perfil ainda depende de um CSS de página muito grande; precisa migrar para componentes reutilizáveis.
- Há dependência cruzada entre páginas, especialmente quando um CSS de perfil sustenta outra área.
- O shell ainda não está 100% consistente entre páginas internas.
- Alguns arquivos de página carregam estilos demais para o que realmente usam.
- A nomenclatura de arquivos ainda mistura responsabilidade visual e funcional.

## Próximos passos recomendados
1. Extrair blocos reutilizáveis do perfil para `assets/css/components/profile/`.
2. Reduzir acoplamento entre `perfil.css` e páginas sociais.
3. Padronizar hero, tabs e cards internos em uma biblioteca leve.
4. Revisar scripts de página para remover sobreposição de estados.
5. Consolidar documentação de layout e tokens visuais antes de novas páginas.
