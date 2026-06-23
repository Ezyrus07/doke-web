# components/ui-surface

Contrato canônico de superfícies do Doke, dividido por responsabilidade.

Ordem dos módulos:
1. `tokens.css` — variáveis e acentos visuais.
2. `overlay-root.css` — travamento de scroll, backdrop e root de overlays.
3. `surface-contract.css` — aparência base de superfícies reais.
4. `dropdowns-menus.css` — exceções para menus/dropdowns.
5. `buttons-close.css` — botões, ações e botões de fechar.
6. `forms-controls.css` — inputs, selects e textareas em superfícies.
7. `cards-media.css` — cards reutilizáveis de serviço/mídia/perfil.
8. `responsive.css` — contrato mobile.

Regra: CSS de página não deve redesenhar botão, modal, input ou card reutilizável; deve apenas compor layout específico.
