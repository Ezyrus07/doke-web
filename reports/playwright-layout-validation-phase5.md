# Playwright layout validation — Phase 5

## Objetivo

Este ciclo adiciona um teste estrutural para proteger o contrato global de layout antes das próximas fases de limpeza CSS e auditoria de navegação.

## Arquivo criado

```txt
tests/e2e/global-layout-contract.spec.js
```

## Script npm adicionado

```bash
npm run test:layout-contract
```

O script usa `--project=desktop-chrome` para evitar duplicação dos mesmos viewports nos projetos `mobile-chrome` e `desktop-chrome` definidos no `playwright.config.js`. Os viewports reais são controlados dentro do próprio spec.

## Pré-requisitos

O projeto usa `@playwright/test`. Antes de rodar pela primeira vez em uma máquina nova:

```bash
npm install
npx playwright install
```

Para executar os testes, rode o site localmente no endereço configurado em `playwright.config.js`:

```txt
http://127.0.0.1:5500
```

Exemplo com Live Server do VS Code: abrir a raiz do projeto e iniciar o servidor na porta `5500`.

## Páginas cobertas

```txt
index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```

## Viewports cobertas

```txt
desktop: 1366x768
tablet: 820x1180
mobile: 390x844
```

## Checagens implementadas

- `body[data-page]` precisa corresponder à página aberta.
- `document.documentElement.scrollWidth` não pode exceder `clientWidth`.
- Header e conteúdo precisam manter trilhos compatíveis no desktop para páginas internas.
- Sidebar desktop, quando visível, precisa ficar próxima do token global de largura.
- Fluxo `index -> perfil -> pedidos -> mensagens -> resultados` via `window.DokeNavigate()` não pode causar reload completo.
- Após `DokeNavigate`, `body[data-page]` e overflow horizontal são revalidados.

## Observação de escopo

Este teste ainda não resolve o bug de scroll vertical via roteador interno. Ele prepara a fundação de Playwright necessária para a fase posterior, onde será criado um teste específico comparando carregamento direto por URL versus navegação por `DokeNavigate`.
