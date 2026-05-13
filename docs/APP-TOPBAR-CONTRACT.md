# App Topbar Contract — Desktop

Este contrato define o padrão global do header/topbar desktop do Doke.

## Decisão

O desktop topbar não pertence a uma página específica. Ele é um pattern global com três slots:

1. **Slot esquerdo fixo** (`data-topbar-left`): botão/controle de pesquisa.
2. **Slot contextual** (`data-topbar-context`): conteúdo variável da página, como localização, filtros, seleção, agenda ou ações contextuais.
3. **Slot direito fixo** (`data-topbar-actions`): ações globais e perfil do usuário.

A página pode alterar o conteúdo do slot contextual, mas não deve redefinir altura, eixo, padding, gap, alinhamento, largura ou posição global do topbar.

## Estrutura esperada

```html
<header class="topbar internal-page-topbar app-topbar" data-app-topbar data-shell-topbar data-topbar-contract="desktop-app-topbar">
  <div class="topbar__left app-topbar__left" data-topbar-left>
    <!-- search control fixo -->
  </div>
  <div class="topbar__center app-topbar__context" data-topbar-context>
    <!-- localização / filtros / selecionar / agenda / ações da página -->
  </div>
  <div class="topbar__right app-topbar__right" data-topbar-actions>
    <!-- ações globais + conta -->
  </div>
</header>
```

## Regras

- Não criar um novo header local para corrigir uma página.
- Não usar `style=""` para ajustar header.
- Não usar `!important` novo para posicionar topbar.
- Não mexer em `body`, shell, sidebar ou wrapper global para resolver diferença local de header.
- CSS global do topbar fica em `assets/css/patterns/app-topbar.css`.
- CSS de página pode controlar apenas conteúdo interno do slot contextual, sem redefinir a estrutura da topbar.

## Pendências conhecidas

Algumas páginas ainda não têm topbar desktop global por design provisório ou porque precisam de reconstrução visual posterior. Elas devem ser migradas em ciclo próprio, não por cópia cega de outro header.
